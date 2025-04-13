### Test Security and Edge Cases
-- **Access /accounts**
-- This will redirect to Login Page if not logged then return Unauthorized Access:
![image](https://github.com/user-attachments/assets/2506022b-63ff-4504-bbc2-14420df92342)
![image](https://github.com/user-attachments/assets/9e86a87e-5dd3-418f-9bcc-111814d51d22)

-- **Login with non-existing Account**
-- User will not be able to log-in and return error:
![image](https://github.com/user-attachments/assets/880e84e2-b238-4af3-be55-74a6da9a7bca)
![image](https://github.com/user-attachments/assets/32096e87-91d8-4ed3-a2e4-d8285ec40abe)

-- **Access /forgot-password route**
-- This will redirect to login because user has no token.
![image](https://github.com/user-attachments/assets/581d5654-f18c-49b3-90a5-eaa89c36eb48)
![image](https://github.com/user-attachments/assets/dfcab142-0dfe-4e1c-8c85-f2107a3e3be2)
![image](https://github.com/user-attachments/assets/50d5e76c-9c52-44e7-9ec1-8dfc6d8087da)

-- **Access Admin Home Page**
-- This will redirect to login because user is unauthorized and has no token.
![image](https://github.com/user-attachments/assets/c9dee971-5ea5-4f5d-8848-dcbe9edd772b)
![image](https://github.com/user-attachments/assets/46d4aad8-72e9-49b0-894d-82e2ed50c1d9)
![image](https://github.com/user-attachments/assets/64a1a417-dd6a-472e-9ee9-096a82ff1d0f)

-- **Access Profile Page**
-- This will redirect to login because user is unauthorized and has no token
![image](https://github.com/user-attachments/assets/61aeddf9-2eb4-4a57-a406-d859bbe5c97a)
![image](https://github.com/user-attachments/assets/ea9e228c-9fca-45c6-a8e1-bc888bb67a81)
![image](https://github.com/user-attachments/assets/39c969cf-6928-4cb2-a4cf-ac3de00dd7ae)











