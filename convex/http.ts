import { httpRouter } from "convex/server";
import { authComponent } from "./auth";

const http = httpRouter();

http.route({
	path: "/api/auth/*",
	method: "*",
	handler: authComponent.handler
});

export default http;
