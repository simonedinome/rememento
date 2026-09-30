#!/usr/bin/env bash
# Floor di CONSTRAINTS.md (regole 1-3) sulle righe di codice aggiunte rispetto al branch base:
# commit del branch, modifiche non committate e file nuovi non ancora tracciati.
# Base: $FLOOR_BASE_REF, default origin/main.
set -euo pipefail

base_ref="${FLOOR_BASE_REF:-origin/main}"
if ! git rev-parse --verify --quiet "$base_ref" >/dev/null; then
	git fetch --quiet origin "${base_ref#origin/}"
fi
base=$(git merge-base HEAD "$base_ref")

code=('*.ts' '*.mts' '*.cts' '*.js' '*.mjs' '*.cjs' ':(exclude)worker-configuration.d.ts')

added_lines() {
	git diff --no-color --unified=0 "$base" -- "${code[@]}" | awk '
		/^\+\+\+ / { file = substr($0, 7); next }
		/^@@/ { match($0, /\+[0-9]+/); line = substr($0, RSTART + 1, RLENGTH - 1); next }
		/^\+/ { print file "\t" line "\t" substr($0, 2); line++ }
	'
	git ls-files --others --exclude-standard -- "${code[@]}" | while IFS= read -r file; do
		awk -v file="$file" '{ print file "\t" NR "\t" $0 }' "$file"
	done
}

added_lines | perl -e '
	use strict;
	use warnings;

	my @line_rules = (
		["\@ts-ignore", qr/\@ts-ignore/],
		["\@ts-expect-error senza motivo", qr/\@ts-expect-error\s*(?:\*\/\s*)?$/],
		["biome-ignore", qr/biome-ignore/],
		["test saltato o isolato", qr/\.(?:skip|skipIf|only|todo)\s*\(/],
		["stub non implementato", qr/not implemented/i],
		["TODO al posto dell implementazione", qr/\bTODO\b/],
	);
	my @block_rules = (
		["catch vuoto", qr/\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/],
		["catch vuoto", qr/\.catch\(\s*(?:\([^)]*\)|\w+)\s*=>\s*\{\s*\}\s*\)/],
	);

	my @violations;
	my ($block_file, $block_start, $block_next, $block_text) = ("", 0, 0, "");

	sub check_block {
		return if $block_text eq "";
		for my $rule (@block_rules) {
			my ($name, $re) = @$rule;
			while ($block_text =~ /$re/g) {
				my $offset = $-[0];
				my $line = $block_start + (substr($block_text, 0, $offset) =~ tr/\n//);
				push @violations, "$block_file:$line  $name";
			}
		}
	}

	while (my $entry = <STDIN>) {
		chomp $entry;
		my ($file, $line, $text) = split /\t/, $entry, 3;
		$text //= "";
		for my $rule (@line_rules) {
			my ($name, $re) = @$rule;
			push @violations, "$file:$line  $name: $text" if $text =~ $re;
		}
		if ($file ne $block_file || $line != $block_next) {
			check_block();
			($block_file, $block_start, $block_text) = ($file, $line, "");
		}
		$block_text .= "$text\n";
		$block_next = $line + 1;
	}
	check_block();

	if (@violations) {
		print STDERR "floor-guard: violazioni del floor (CONSTRAINTS.md)\n";
		print STDERR "  $_\n" for @violations;
		exit 1;
	}
	print "floor-guard: ok\n";
'
