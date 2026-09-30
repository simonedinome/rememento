# Provisioning delle risorse Cloudflare

Comandi usati per il Task 2 di `tasks/todo.md` (30 settembre 2026, wrangler 4.145.0). Si rieseguono in quest'ordine su un account nuovo; su un account dove le risorse esistono già i comandi `create` falliscono, quindi prima si controllano le liste.

## Prerequisiti manuali (dashboard Cloudflare)

1. API token con permessi Edit su Workers Scripts, D1, Workers R2 Storage e Vectorize, più Read su Account Settings. Il token viene letto da `CLOUDFLARE_API_TOKEN`, l'account da `CLOUDFLARE_ACCOUNT_ID`.
2. R2 attivato dalla dashboard (R2 Object Storage). Senza attivazione l'API risponde `code 10042`.
3. Sottodominio `workers.dev` creato aprendo una volta Workers & Pages. Senza sottodominio l'API risponde `code 10007`. Sottodominio attuale: `simonecarlucci33`.
4. Allowlist di rete dell'ambiente cloud con `api.cloudflare.com`, più `*.workers.dev` per la verifica finale con `curl`.

## Verifica dell'autenticazione

```
npx wrangler whoami
```

Il token è di tipo account: la verifica via API va fatta su `/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify`, non su `/user/tokens/verify` (che risponde `Invalid API Token`).

## Controllo delle risorse esistenti

```
npx wrangler d1 list
npx wrangler r2 bucket list
npx wrangler vectorize list
```

## Creazione

```
npx wrangler d1 create meetings-db --location weur
npx wrangler r2 bucket create meetings-audio --location weur
npx wrangler vectorize create meetings-vectors --dimensions 1536 --metric cosine
```

1. La location di D1 e R2 non si può cambiare dopo la creazione. `weur` (Europa occidentale) perché l'uso è dall'Italia; nessuna `--jurisdiction`.
2. Le 1536 dimensioni corrispondono a `text-embedding-3-small`. Cambiarle significa creare un indice nuovo e ricalcolare tutti gli embedding.

## Binding in `wrangler.toml`

`--update-config` non modifica il file quando wrangler gira senza terminale interattivo, quindi i binding vanno scritti a mano. Il `database_id` è quello stampato da `d1 create` (o dalla colonna `uuid` di `d1 list`):

```toml
[[d1_databases]]
binding = "DB"
database_name = "meetings-db"
database_id = "80aea149-b007-4936-a171-fb171f277921"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "meetings-audio"

[[vectorize]]
binding = "VECTORS"
index_name = "meetings-vectors"
```

Dopo ogni modifica ai binding si rigenerano i tipi di `Env`:

```
npm run cf-typegen
```

Vectorize non ha emulazione locale: nei test compare un avviso, ed è atteso. Non si usa `remote: true`, perché i test non fanno chiamate di rete (`SPEC-core.md`).

## Deploy e verifica

```
npx wrangler deploy
curl https://rememento.simonecarlucci33.workers.dev/health   # atteso: ok
```

Il nome del Worker (`name` in `wrangler.toml`) è `rememento`. Il deploy sovrascrive un eventuale Worker con lo stesso nome creato dalla dashboard.
