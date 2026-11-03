import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router'
import './index.css'
import './styles/main.scss'
import App from './App.tsx'

// Redux imports
import { store } from './app/store.ts'
import { Provider } from 'react-redux'

import Authors from './components/author-display-components/Authors.tsx'
import Author from './components/author-display-components/Author.tsx'
import Header from './components/header-components/Header.tsx'
import Login from './components/auth-components/Login.tsx'
import Register from './components/auth-components/Register.tsx'


    // register service worker and handle the asyncronous operation source: https://mswjs.io/guides/integrations/browser
  async function enableMocking() {
    if (!import.meta.env.DEV) {
      return
    }

    const { worker } = await import('./mocks/browser')

    // `worker.start()` returns a Promise that resolves
    // once the Service Worker is up and ready to intercept requests.
    return worker.start()
  }


enableMocking().then(() => {
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<><Header title="FriendFace" subtitle="all your friends are here" /><Login /></>} />
          <Route path="/register" element={<><Header title="FriendFace" subtitle="all your friends are here" /><Register /></>} />
          <Route path="/authors/"element={ <><Authors /></>} />
          <Route path="/authors/:authorName" element={ <><Authors /> <Author /> </>} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>
)});
