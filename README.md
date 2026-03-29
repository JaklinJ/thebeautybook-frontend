# Beauty Salon Mobile App

React Native mobile app for laser hair removal beauty salon management.

## Features

- Salon registration and login
- Customer management with alphabetical listing
- Search customers by name
- Customer profile with visit history
- Add new appointments with multiple zones and power settings
- Progress tracking with statistics (total visits, average power, max/min power per zone)

## Setup

1. Install dependencies:
```bash
npm install
```

2. **Configure API URL** in `config/api.js`:
   - **For production**: Set `API_BASE_URL` to your deployed backend URL (e.g., `https://your-app.railway.app/api`)
   - **For development**: Use `http://localhost:5000/api` (simulators) or your computer's IP (physical devices)

3. Start the development server:
```bash
npm start
```

4. Run on your device:
- For iOS: Press `i` in the terminal or run `npm run ios`
- For Android: Press `a` in the terminal or run `npm run android`

## Important: Deployment

**For the app to work from anywhere (different cities, networks, etc.), you MUST deploy your backend to the cloud.**

See `../DEPLOYMENT.md` for detailed deployment instructions.

The app is now simplified - no more IP address configuration needed! Just deploy your backend and update the API URL in `config/api.js`.

## Project Structure

```
frontend/
├── screens/          # Screen components
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── HomeScreen.js
│   ├── CustomerProfileScreen.js
│   └── AddAppointmentScreen.js
├── context/          # React Context
│   └── AuthContext.js
├── config/           # Configuration files
│   └── api.js        # Simple API configuration
└── App.js            # Main app component
```

## Notes

- The app uses AsyncStorage to persist authentication tokens
- All API calls include authentication headers automatically
- Data is stored in MongoDB on your backend server
- For production use, deploy backend to cloud (Railway, Render, Heroku, etc.)
