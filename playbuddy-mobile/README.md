## Wishlist

### Sharing Wishlist

#### Flow Summary:

1. **Generate shareable wishlist link**.
2. **User clicks the link**.
3. **App handles the deep link** and extracts the `share_code`.
4. **App fetches the wishlist** associated with the `share_code` from the backend.
5. **App displays the shared wishlist** in a read-only view.

#### 1. Share Code Generation (By the Wishlist Owner)

- **Creating the shareable link**: The wishlist owner generates a shareable link containing a unique `share_code`. This link could be in the format:
  ```
  playbuddy://wishlist?share_code=ABC123
  ```
  The `share_code` is tied to the user’s wishlist in the backend.

#### 2. User Receives the Share Link

- **Link Distribution**: The owner shares the link through text, email, or other messaging platforms. The recipient clicks the link to access the shared wishlist.

#### 3. Deep Linking to the App (Mobile App)

- **Deep Link Handling**: When the user clicks the shared link, the app handles the deep link and extracts the `share_code` from the URL.
  - Example of extracting the `share_code` using React Native's `Linking` module:
    ```javascript
    const handleDeepLink = (event) => {
      const { path, queryParams } = Linking.parse(event.url);
      const shareCode = queryParams?.share_code;
    };
    ```

#### 4. Fetching the Shared Wishlist

- **API Call**: Once the app extracts the `share_code`, it makes an API call to fetch the wishlist associated with that code.

  - Example API request:
    ```typescript
    axios.get(`${API_BASE_URL}/wishlist/friend/${shareCode}`);
    ```

- **Backend Lookup**: The server verifies the `share_code`, retrieves the corresponding wishlist, and sends the data back to the app.

#### 5. Displaying the Shared Wishlist

- **UI Rendering**: Once the app fetches the wishlist, it renders the events on a dedicated UI.
  - **Handling Edge Cases**:
    - **Invalid or Expired `share_code`**: Show an error message if the code is invalid or expired.
    - **Empty Wishlist**: Display a message like "No events in this wishlist" if the wishlist is empty.

#### 6. Interaction with the Shared Wishlist

- **Read-Only Mode**: The user viewing the shared wishlist is in a read-only mode. They can view events but cannot modify them.
- **Call to Action**: Prompt the user to create their own wishlist or sign up to save the shared wishlist to their account.
