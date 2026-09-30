export default {
	fetch(request): Response {
		const url = new URL(request.url);
		if (request.method === "GET" && url.pathname === "/health") {
			return new Response("ok");
		}
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
