import React from 'react';
import { createRoot } from "react-dom/client";
import { Provider } from 'react-redux';
import { store } from './store';
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Force unregister Service Workers to fix stale cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Unregistering Service Worker:', registration);
      registration.unregister();
    }
  });
}

root.render(
  <React.StrictMode>
    <React.Fragment>  
        <Provider store={store}>
          <App />
      </Provider>
    </React.Fragment>
  </React.StrictMode>
);
