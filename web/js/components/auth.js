// auth.js

import {navigate} from "../router.js";
import {previousPage, removeCurrentUser, setCurrentUser} from "../state.js";
import {fetchAPI} from "../api.js";
import Toastr from "../toastr.js";
import Modal from "../modal.js";
import {webSock} from "../websock.js";
import { ChatComponent } from "../components.js";

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
          <input name="username" type="text" id="username" required placeholder="Username">
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
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            const user = await fetchAPI('/login', 'POST', { username, password });
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
        <input type="text" id="nickname" required placeholder="Nickname">
        <input type="number" id="age" required placeholder="Age" min="13" max="99">
        <select id="gender" required>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
        </select>
        <input type="text" id="first_name" required placeholder="First Name">
        <input type="text" id="last_name" required placeholder="Last Name">
      <input type="email" id="email" required placeholder="Email">
      <input type="password" id="password" required placeholder="Password">
      <button type="submit">Register</button>
    </form>
  `;
        document.getElementById('registerForm').addEventListener('submit', handleRegister);
    }

    async handleRegister(event) {
        event.preventDefault();
        const nickname = document.getElementById('nickname').value;
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        if (['Male','Female','Other'].includes(gender) === false) {
            Toastr.error('Wallahi You are gay');
            return;
        } else if (gender === 'Other') {
            Toastr.error('Other? Really?');
            return;
        }
        const first_name = document.getElementById('first_name').value;
        const last_name = document.getElementById('last_name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const user = await fetchAPI('/register', 'POST', { nickname, age, gender, first_name, last_name, email, password });
            setCurrentUser(user);
            Toastr.success('Registration successful');
            webSock.register();
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
                    ChatComponent.removeChats();
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