// auth.js

import {navigate} from "../router.js";
import {previousPage, removeCurrentUser, setCurrentUser} from "../state.js";
import {fetchAPI} from "../api.js";
import Toastr from "../toastr.js";
import Modal from "../modal.js";

export class Auth {

    constructor() {
        this.content = document.getElementById('content');
        window.handleLogin = this.handleLogin;
        window.handleRegister = this.handleRegister;
        window.handleLogout = this.handleLogout;
    }

    // Login
    renderLoginForm() {
        this.content.innerHTML = `
        <h2>Login</h2>
        <form id="loginForm">
          <input name="email" type="email" id="email" required placeholder="Email">
          <input name="password" type="password" id="password" required placeholder="Password">
          <div id="loginButtons">
          <button type="submit">Login</button>
          </div>
        </form>
      `;

        const loginButtons = document.getElementById('loginButtons');

        const googleButton = document.createElement('button');
        googleButton.textContent = 'Login with Google';
        googleButton.onclick = (event) => {
            event.preventDefault();
            window.location.href = '/api/login/google';
        }
        googleButton.id = 'googleButton';
        loginButtons.appendChild(googleButton);

        const githubButton = document.createElement('button');
        githubButton.textContent = 'Login with Github';
        githubButton.onclick = (event) => {
            event.preventDefault();
            window.location.href = '/api/login/github';
        }
        githubButton.id = 'githubButton';
        loginButtons.appendChild(githubButton);

        document.getElementById('loginForm').addEventListener('submit', handleLogin);
    }

    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const user = await fetchAPI('/login', 'POST', { email, password });
            setCurrentUser(user);
            Toastr.success('Login successful');
            navigate(previousPage);
        } catch (error) {
            Toastr.error(error.message)
        }
    }

    // Register
    renderRegisterForm() {
        this.content.innerHTML = `
    <h2>Register</h2>
    <form id="registerForm">
      <input type="email" id="email" required placeholder="Email">
      <input type="text" id="username" required placeholder="Username">
      <input type="password" id="password" required placeholder="Password">
      <button type="submit">Register</button>
    </form>
  `;
        document.getElementById('registerForm').addEventListener('submit', handleRegister);
    }

    async handleRegister(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            const user = await fetchAPI('/register', 'POST', { email, username, password });
            setCurrentUser(user);
            Toastr.success('Registration successful');
            navigate('home');
        } catch (error) {
            Toastr.error(error.message);
        }
    }

    // Logout
    handleLogout() {
        let logout = () => {
            fetchAPI('/logout')
                .then(r => {
                    console.log('Logout response:', r);
                    removeCurrentUser()
                    navigate('home');
                    Toastr.success('Logout successful');
                }).catch(e => {
                console.error('Logout failed:', e);
                Toastr.error('Error logging out');
            });
        }

        Modal.show('Are you sure you want to logout?', logout);
    }

    handleCallback(provider) {
        fetchAPI('/login-session')
            .then(user => {
                setCurrentUser(user);
                Toastr.success('Login successful via ' + provider);
                navigate('Home');
            }).catch(e => {
            console.error('Login failed:', e);
            Toastr.error('Error logging in');
        });
    }
}