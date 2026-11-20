export interface SecretMapping {
  secret_key?: string;
  injected_key?: string;
}

export function toSecretsPatch(secrets: SecretMapping[] | null | undefined) {
  return (secrets || [])
    .filter((secret) => secret?.secret_key?.trim())
    .map((secret) => {
      const secretKey = secret.secret_key!.trim();
      // Always send injected_key: the CLI merges the patch by index, so omitting it keeps a stale value.
      return {
        secret_key: secretKey,
        injected_key: secret.injected_key?.trim() || secretKey,
      };
    });
}
