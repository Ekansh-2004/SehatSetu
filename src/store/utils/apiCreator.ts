import axios from "axios";
import { store } from "../index";
import { ERROR, IN_PROGRESS, SUCCESS } from "./actionTypes";

// API Creator configuration
interface ApiConfig {
	action: string;
	url: string;
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	data?: unknown;
	params?: Record<string, unknown>;
	headers?: Record<string, string>;
}

// API Creator function
export const apiCreator = async (config: ApiConfig) => {
	const { action, url, method, data, params, headers } = config;

	// Dispatch in-progress action
	store.dispatch({
		type: action + IN_PROGRESS,
		payload: null,
	});

	try {
		// Make API call
		const response = await axios({
			method,
			url,
			data,
			params,
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
		});

		const responseData = response.data.data || response.data;

		// Dispatch success action
		const successAction = {
			type: action + SUCCESS,
			payload: responseData,
		};
		store.dispatch(successAction);

		return responseData;
	} catch (error: unknown) {
		const axiosError = error as any;
		const errorMessage = axiosError?.response?.data?.error || axiosError?.response?.data?.message || axiosError?.message || "An error occurred";

		// Dispatch error action
		const errorAction = {
			type: action + ERROR,
			payload: errorMessage,
		};
		store.dispatch(errorAction);

		// Re-throw with full error context (including status code)
		const errorWithContext = new Error(errorMessage);
		Object.assign(errorWithContext, { response: axiosError?.response });
		throw errorWithContext;
	}
};

// Helper functions for common API patterns
export const apiGet = (action: string, url: string, params?: Record<string, unknown>) => apiCreator({ action, url, method: "GET", params });

export const apiPost = (action: string, url: string, data?: unknown) => apiCreator({ action, url, method: "POST", data });

export const apiPut = (action: string, url: string, data?: unknown) => apiCreator({ action, url, method: "PUT", data });

export const apiDelete = (action: string, url: string) => apiCreator({ action, url, method: "DELETE" });
