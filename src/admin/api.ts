export class ApiRequestError extends Error {
  status: number;
  dependencies: string[];

  constructor(message: string, status: number, dependencies: string[] = []) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.dependencies = dependencies;
  }
}

async function getBearerHeaders(isFormData = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function adminFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    formData?: FormData;
  } = {},
): Promise<T> {
  const isForm = Boolean(options.formData);
  const headers = await getBearerHeaders(isForm);

  const fetchInit: RequestInit = {
    method: options.method || "GET",
    headers,
    credentials: "same-origin",
  };

  if (options.formData) {
    fetchInit.body = options.formData;
  } else if (options.body !== undefined) {
    fetchInit.body = JSON.stringify(options.body);
  }

  const res = await fetch(path, fetchInit);
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    dependencies?: string[];
  };

  if (!res.ok) {
    throw new ApiRequestError(
      json.error || `Request failed with status ${res.status}`,
      res.status,
      Array.isArray(json.dependencies) ? json.dependencies : [],
    );
  }

  return json as T;
}

export async function uploadImagesToMediaLibrary(params: {
  files: FileList | File[];
  entityType: string;
  entityId?: number | null;
  altTextEn?: string;
  altTextKa?: string;
  isMain?: boolean;
}) {
  const formData = new FormData();
  Array.from(params.files).forEach((f) => formData.append("files", f));
  formData.append("entityType", params.entityType);
  if (params.entityId) formData.append("entityId", String(params.entityId));
  if (params.altTextEn) formData.append("altTextEn", params.altTextEn);
  if (params.altTextKa) formData.append("altTextKa", params.altTextKa);
  if (params.isMain) formData.append("isMain", "true");

  return adminFetch<Array<{ id: number; url: string; fileName: string }>>(
    "/api/admin/media/upload",
    {
      method: "POST",
      formData,
    },
  );
}
