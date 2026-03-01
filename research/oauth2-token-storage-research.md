# OAuth2 Token Storage Research for Node.js CLI Applications

## Executive Summary

This document analyzes secure OAuth2 token storage options for a Node.js CLI application that stores Gmail OAuth2 tokens locally. The primary recommendation is to use **@napi-rs/keyring** for production applications, with a fallback to **AES-256-GCM encrypted files** for environments where OS keychain access is unavailable.

---

## Option 1: keytar (OS Keychain via node-keytar)

### Overview
Keytar is a cross-platform Node.js library that provides native OS keychain/keyring access. It uses native C++ bindings to interface with platform-specific credential stores.

### Security Level: HIGH
- Tokens stored in OS-native secure storage (Keychain on macOS, Credential Vault on Windows, Secret Service on Linux)
- Protected by OS-level encryption and user authentication
- Not extractable by other applications without explicit user permission
- Keys are not stored in application code or configuration files

### Portability
| Platform | Backend | Requirements |
|----------|---------|--------------|
| macOS | Keychain (Security.framework) | None |
| Windows | Credential Vault (DPAPI) | None |
| Linux | Secret Service API / libsecret | libsecret-1-dev or equivalent |

### User Experience
- **No prompts on read/write**: Once OS session is authenticated, operations are seamless
- **Initial setup on Linux**: May require installing libsecret development headers
- **Keychain unlock**: On macOS, first access may prompt for keychain password depending on settings

### Native Module Compilation Issues
- **Requires node-gyp**: Compilation requires Python, C++ compiler, and platform build tools
- **Common pain points**:
  - Windows: Requires Visual Studio Build Tools or Visual C++ Redistributable
  - Linux: Requires libsecret headers (`libsecret-1-dev` on Debian/Ubuntu, `libsecret-devel` on RHEL)
  - macOS: Requires Xcode Command Line Tools
- **Electron compatibility**: Requires rebuild against Electron's Node version

### TypeScript Support
- TypeScript definitions bundled (`keytar.d.ts`)
- All APIs are async/Promise-based

### Maintenance Status: CONCERNING
- **Project archived**: GitHub repository is read-only since December 2022
- **Last release**: v7.9.0 (February 2022)
- **No active maintenance**: Security updates and bug fixes not being provided
- **Recommendation**: Not suitable for new projects due to maintenance status

### Recovery/Backup Considerations
- Tokens are backed up with OS keychain backups
- macOS: Keychain backups via Time Machine
- Windows: Credentials are tied to user profile
- Linux: Depends on specific Secret Service implementation
- **Migration**: Difficult to export/import tokens for backup purposes

---

## Option 2: @napi-rs/keyring (Recommended Alternative to keytar)

### Overview
A modern Rust-based alternative to keytar using NAPI-RS for Node.js bindings. Provides the same cross-platform keychain access with better performance and active maintenance.

### Security Level: HIGH
- Same security model as keytar (OS-native credential storage)
- Uses platform-specific secure backends
- Hardware-backed encryption where available

### Portability
| Platform | Backend |
|----------|---------|
| macOS | Keychain (Security.framework) |
| Windows | Windows Credential Manager |
| Linux | Secret Service API / D-Bus |

### User Experience
- **Prebuilt binaries**: No compilation required for most platforms
- **Faster installation**: No node-gyp build step
- **Same seamless operation** as keytar once installed

### Native Module Considerations
- **No compilation at install time**: Prebuilt binaries via NAPI-RS
- **Rust-based**: Uses N-API for stable ABI compatibility
- **Better Node.js version support**: Modern N-API usage

### TypeScript Support
- Full TypeScript support with type definitions
- Modern ESM/CommonJS dual module support

### Maintenance Status: EXCELLENT
- **Active development**: Part of the NAPI-RS ecosystem
- **Regular updates**: Actively maintained
- **Modern approach**: Uses Rust instead of C++

### API Example
```typescript
import { setPassword, getPassword, deletePassword } from '@napi-rs/keyring';

// Store token
await setPassword('gmail-sweep', 'user@example.com', refreshToken);

// Retrieve token
const token = await getPassword('gmail-sweep', 'user@example.com');

// Delete token
await deletePassword('gmail-sweep', 'user@example.com');
```

---

## Option 3: AES-256-GCM Encrypted File

### Overview
Custom implementation using Node.js built-in `crypto` module to encrypt tokens before storing them on disk. Requires a master key for encryption/decryption.

### Security Level: MEDIUM-HIGH (with caveats)
- **Encryption**: AES-256-GCM provides authenticated encryption
- **Key management challenge**: The master key must be stored securely
- **Vulnerable to**: Key extraction from application code, memory dumps
- **Protection level**: Protects against casual file system access but not determined attackers with code access

### Implementation Pattern
```typescript
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

class SecureTokenStorage {
  private key: Buffer;

  constructor(masterKey: string, salt: string) {
    // Derive 32-byte key using scrypt
    this.key = scryptSync(masterKey, salt, 32);
  }

  encrypt(token: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Store: iv (12) + authTag (16) + ciphertext
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(encryptedData: string): string {
    const data = Buffer.from(encryptedData, 'base64');

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString('utf8');
  }
}
```

### Portability
- **Universal**: Pure Node.js, works on all platforms
- **No dependencies**: Uses only built-in `crypto` module
- **No compilation**: Zero native dependencies

### User Experience
- **Transparent**: No user prompts or setup required
- **Master key handling**: Must derive or obtain master key securely
- **Potential password prompt**: If using password-derived keys

### Key Management Options
| Approach | Security | UX |
|----------|----------|-----|
| Environment variable | LOW | Good |
| Password-derived (scrypt) | MEDIUM | Requires password entry |
| OS keychain (for master key) | HIGH | Seamless |
| Hardware security module | VERY HIGH | Complex |

### Recovery/Backup Considerations
- **Encrypted files are portable**: Can be backed up and restored
- **Master key critical**: Loss of master key = loss of all tokens
- **Versioning**: Encrypted format can be versioned for migration

---

## Option 4: Config File with Restrictive Permissions (0600)

### Overview
Store tokens in a JSON/config file with Unix-style restrictive permissions (owner read/write only).

### Security Level: LOW
- **No encryption**: Tokens stored in plaintext
- **Permission-based protection only**: Relies on OS file permissions
- **Vulnerable to**: Root access, backup exposure, file system traversal attacks
- **Not suitable for production**: Should only be used for development

### Implementation
```typescript
import { writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

function storeTokenPlain(token: string): void {
  const configPath = join(homedir(), '.gmail-sweep', 'tokens.json');
  const data = JSON.stringify({ refreshToken: token }, null, 2);

  writeFileSync(configPath, data, { mode: 0o600 });
  // 0o600 = owner read/write, no group, no other
}
```

### Portability
- **Unix/Linux/macOS**: Full support for permission bits
- **Windows**: Permission model differs; 0o600 has limited effect
- **Simple**: No dependencies or compilation

### User Experience
- **Best UX**: Completely transparent to users
- **No setup**: No prompts, no dependencies
- **Development-friendly**: Easy to inspect and debug

### When to Use
- **Development only**: Acceptable for local development
- **Testing**: Suitable for test environments with non-sensitive data
- **CI/CD**: For automated testing with throwaway credentials

---

## Option 5: conf (or electron-store for CLI)

### Overview
`conf` is a popular configuration management library for Node.js applications. `electron-store` is built on top of `conf` with Electron-specific enhancements.

### Security Level: LOW-MEDIUM
- **Optional encryption**: Supports AES-256-CBC encryption
- **Critical vulnerability**: Uses CBC mode without authentication (vulnerable to tampering)
- **Encryption for obscurity**: Prevents casual viewing but not determined attacks
- **Key storage issue**: Encryption key must be provided and stored

### Portability
- **Universal**: Pure JavaScript, works everywhere
- **No native dependencies**: Zero compilation requirements

### User Experience
- **Excellent**: Simple API, automatic schema validation
- **Watching**: Can watch for config changes
- **Migrations**: Built-in schema migration support

### Security Concerns
From [Jesse Li's security analysis](https://blog.jse.li/posts/electron-store-encryption/):
> "electron-store/conf encryption does NOT ensure integrity — the aes-256-cbc mode is vulnerable to tampering attacks. An attacker can modify encrypted config files without knowing the key."

### TypeScript Support
- Full TypeScript support with generic typing
- Schema validation with type inference

### When to Use
- **Non-sensitive configuration**: Great for app settings, preferences
- **Not recommended for**: OAuth tokens, passwords, or sensitive credentials

---

## Token Refresh Handling

### Automatic Refresh Pattern
The Google Auth Library handles automatic token refresh:

```typescript
import { OAuth2Client } from 'google-auth-library';

const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Set credentials with refresh token
oauth2Client.setCredentials({
  access_token: accessToken,
  refresh_token: refreshToken,
  expiry_date: expiryDate
});

// Listen for token refresh events
oauth2Client.on('tokens', async (tokens) => {
  if (tokens.refresh_token) {
    // Store new refresh_token (only sent on first authorization)
    await saveRefreshToken(tokens.refresh_token);
  }

  // Always update access_token and expiry
  await updateStoredTokens({
    access_token: tokens.access_token,
    expiry_date: tokens.expiry_date
  });
});
```

### Refresh Timing Best Practices
1. **Proactive refresh**: Refresh 5 minutes before expiry to avoid race conditions
2. **Event-driven**: Use the `tokens` event to persist refreshed tokens
3. **Atomic updates**: Store both access_token and expiry_date together
4. **Retry logic**: Implement exponential backoff for refresh failures

### Error Handling
```typescript
async function makeAuthenticatedRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (error.code === 401 && attempt < maxRetries) {
        // Force token refresh
        await oauth2Client.refreshAccessToken();
        continue;
      }

      if (error.message.includes('invalid_grant')) {
        // Refresh token revoked - require re-authentication
        await promptReauthentication();
        throw new Error('Token revoked. Please re-authenticate.');
      }

      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Multiple Account Support

### Key Structure Design
For storing tokens for multiple Gmail accounts, use a composite key structure:

```typescript
interface AccountKey {
  service: string;      // 'gmail-sweep'
  account: string;      // 'user@example.com' or unique account ID
}

// Storage structure
interface StoredAccount {
  provider: 'google';
  email: string;
  refreshToken: string;  // Encrypted or in keychain
  accessToken?: string;  // Optional: can be memory-only
  expiresAt?: number;    // Timestamp
  scopes: string[];      // Granted OAuth scopes
}
```

### Keychain Service Naming
```typescript
// For @napi-rs/keyring
const SERVICE_NAME = 'gmail-sweep';

// Store each account separately
await setPassword(SERVICE_NAME, accountEmail, encryptedData);

// List all accounts (requires separate index)
const accounts = await loadAccountIndex();
for (const email of accounts) {
  const token = await getPassword(SERVICE_NAME, email);
}
```

### Account Index Management
Since keychain APIs don't support listing entries by service, maintain a separate index:

```typescript
interface AccountIndex {
  version: number;
  accounts: Array<{
    email: string;
    addedAt: string;
    label?: string;
  }>;
}

// Store index in config file (non-sensitive)
// Store actual tokens in keychain
```

---

## Token Revocation Handling

### Revocation Implementation
```typescript
import axios from 'axios';

async function revokeToken(token: string): Promise<void> {
  try {
    await axios.post('https://oauth2.googleapis.com/revoke', null, {
      params: { token },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  } catch (error: any) {
    // Log but don't throw - continue with local cleanup
    console.warn('Token revocation failed:', error.response?.data || error.message);
  }
}

async function revokeAccount(email: string): Promise<void> {
  const tokens = await loadTokens(email);

  // Revoke both tokens (don't block on failure)
  if (tokens.refreshToken) {
    await revokeToken(tokens.refreshToken);
  }
  if (tokens.accessToken) {
    await revokeToken(tokens.accessToken);
  }

  // Always clear local storage
  await deletePassword('gmail-sweep', email);
  await removeFromAccountIndex(email);
}
```

### Revocation Triggers
- User explicitly logs out
- User deletes account from app
- Token refresh returns `invalid_grant` error
- User revokes access via Google Account settings

---

## Recommendations

### Primary Recommendation: @napi-rs/keyring

**Rationale:**
1. **Security**: Uses OS-native secure storage (same as keytar)
2. **Maintenance**: Actively maintained with modern Rust implementation
3. **No compilation**: Prebuilt binaries eliminate node-gyp issues
4. **TypeScript**: Full TypeScript support
5. **UX**: Seamless user experience once set up

**Implementation approach:**
```typescript
import { setPassword, getPassword, deletePassword } from '@napi-rs/keyring';

const SERVICE = 'gmail-sweep';

export async function storeToken(email: string, token: string): Promise<void> {
  await setPassword(SERVICE, email, token);
}

export async function getToken(email: string): Promise<string | null> {
  return await getPassword(SERVICE, email);
}

export async function removeToken(email: string): Promise<void> {
  await deletePassword(SERVICE, email);
}
```

### Fallback Strategy: Encrypted File

For environments where keychain access is unavailable (headless servers, CI/CD, some Linux setups), implement an encrypted file fallback:

```typescript
export class TokenStorage {
  async store(email: string, token: string): Promise<void> {
    try {
      await setPassword('gmail-sweep', email, token);
    } catch (error) {
      // Fallback to encrypted file
      await this.storeEncrypted(email, token);
    }
  }

  private async storeEncrypted(email: string, token: string): Promise<void> {
    // AES-256-GCM implementation
  }
}
```

### Development Mode

For development, support a `GMAIL_SWEEP_DEV_MODE` environment variable that allows plaintext storage for easier debugging:

```typescript
if (process.env.GMAIL_SWEEP_DEV_MODE === 'true') {
  // Use plaintext JSON storage
} else {
  // Use secure keychain storage
}
```

---

## Summary Comparison Table

| Approach | Security | Portability | UX | Maintenance | Recommendation |
|----------|----------|-------------|-----|-------------|----------------|
| keytar | HIGH | Good (with deps) | Good | ARCHIVED | Avoid |
| @napi-rs/keyring | HIGH | Excellent | Good | Active | **PRIMARY** |
| AES-256-GCM File | MEDIUM-HIGH | Excellent | Good | N/A | Fallback |
| Plaintext (0600) | LOW | Good | Excellent | N/A | Dev only |
| conf/electron-store | LOW-MEDIUM | Excellent | Excellent | Active | Not for tokens |

---

## Sources

- [keytar GitHub Repository](https://github.com/atom/node-keytar)
- [Jesse Li: Breaking electron-store's encryption](https://blog.jse.li/posts/electron-store-encryption/)
- [Stack Exchange: OAuth2 Token Storage Best Practices](https://security.stackexchange.com/questions/271277/what-are-the-best-practices-to-safely-store-oauth2-tokens-in-a-database)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [CyberArk: Token Storage Best Practices](https://docs.cyberark.com/identity-administration/latest/en/content/developer/oidc/tokens/token-storage.htm)
- [WorkOS: OAuth Best Practices](https://workos.com/blog/oauth-best-practices)
