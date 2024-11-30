# **Authentication System Overview**

## **Context Return**

The following values and methods are available from the authentication context:

- **`authUserId`**: The user's ID derived from `session?.user.id`.
- **`userProfile`**: The authenticated user's profile information.
- **`isLoadingAuth`**: Boolean indicating if authentication is fully set up.
- **`isLoadingUserProfile`**: Boolean indicating if the user's profile is being fetched.

### **Hooks Provided**

- **`signInWithEmail`**: Sign in with email and password.
- **`signUpWithEmail`**: Sign up with email, password, and additional details.

- **`authWithPhoneSendOtp`**: Initiate phone-based authentication by sending an OTP.
- **`authWithGoogle`**: Authenticate with Google.
- **`authWithPhoneVerifyOtp`**: Complete phone-based authentication by verifying the OTP.

- **`signOut`**: Sign out the authenticated user.

---

## **Mounting Logic**

### **`useInitializeAuth`**

Handles initial setup and session management:

1. **`checkInitSession`**: Fetches the current session from Supabase. If it exists:
   - Sets up Axios with authentication headers.
   - Initializes the session state.
2. **`authStateListener`**: Monitors changes to authentication state:
   - If the session ends, clears the session and Axios headers.
3. **`appStateListener`**: Handles app state changes:
   - On app foreground, enables session auto-refresh.
4. **Unmount Logic**: Removes `appStateListener` and `authStateListener`.

### **`useSetupAmplitude`**

- Runs only if both the session and user profile are available.
- Configures Amplitude analytics for the authenticated user.

### **`useOnSessionReady`**

- Sets `isLoadingAuth` to `false` when a session is established.
- (Optional: Evaluate necessity if redundant with `authStateListener`.)

### **`useFetchUserProfile`**

- Automatically fetches the user's profile when `session` is set.

---

## **Authentication Lifecycle**

### **Before Sign Up/Sign In**

- Set `isLoadingAuth` to `true` during the authentication process.

### **Authentication Methods**

#### **`signInWithEmail`**

- Calls Supabase's `signInWithPassword`.
- Sets the session upon successful authentication.

#### **`signUpWithEmail`**

- Calls Supabase's `signUp`.
- Sets the session upon successful signup.

#### **`signOut`**

- Calls Supabase's `signOut`.
- Clears the session and resets authentication state.

#### **`authWithPhoneSendOtp`**

- Initiates OTP-based authentication via Supabase's `signInWithOtp`.

#### **`authWithPhoneVerifyOtp`**

- Completes phone authentication by verifying the OTP with Supabase's `verifyOtp`.
- Sets the session upon success.

#### **`authWithGoogle`**

- Uses `runAuthFlow` to streamline the flow.
- Calls `GoogleSignin.signIn` to retrieve a Google ID token.
- Authenticates with Supabase's `signInWithIdToken`.
- Sets the session upon success
- Returns additional Google details (`avatarUrl`, `name`).

---

## **Profile Management**

### **Page 2 - `ProfileDetailsForm`**

- Loads if there is a `session` but no `userProfile` and not `isLoadingUserProfile`
- **User Actions**:
  - Enter `displayName`.
  - Upload Avatar:
    - Uses `useUploadAvatar` to upload the image to storage.
    - Stores the avatar URL in memory.
  - Submit Details:
    - Calls `useInsertUserProfile` with `displayName` and `avatarUrl`.
    - Will automatically go to Profile screen once we have a profile

---

### **Page 3 - `Profile`**

- Loads if both `session` and `userProfile` exist.
- **Features**:
  - **`useUpdateAvatar`**: Allows the user to update their avatar.
  - Displays the user's existing profile information.
