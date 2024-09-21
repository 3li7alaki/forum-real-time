// main.js

import {getAccessibleRoutes, routeIcons, navigate} from "../router.js";
import {currentPage, currentUser} from "../state.js";
import {NotificationComponent} from "../components.js";
import Toastr from "../toastr.js";

export class Main {

    constructor() {
        this.content = document.getElementById('content');
        this.navigation = document.getElementById('navigation');
        window.handleMessage = this.handleMessage;
    }

    renderNavigation() {
        let accessibleRoutes = getAccessibleRoutes();
        const ul = document.createElement('ul');
        accessibleRoutes.forEach(route => {
            const li = document.createElement('li');
            li.classList.add('nav-item');
            if (route === currentPage) {
                li.classList.add('active');
            } else {
                li.classList.add('inactive');
            }

            const a = document.createElement('a');
            a.href = '';
            const navTo = route.charAt(0).toUpperCase() + route.slice(1);
            a.innerHTML = routeIcons[route] + '\n<span class="nav-a-text">' + navTo + '</span>';
            li.id = 'nav-' + navTo;

            switch (route) {
                case 'logout':
                    a.onclick = (event) => {
                        event.preventDefault();
                        handleLogout();
                    }
                    break;
                case 'notifications':
                    if (NotificationComponent.count > 0) {
                        a.textContent += ` (${NotificationComponent.count})`;
                    }
                    a.onclick = (event) => {
                        event.preventDefault();
                        navigate(route);
                    }
                    break;
                default:
                    a.onclick = (event) => {
                        event.preventDefault();
                        navigate(route);
                    }
                    break;
            }

            li.appendChild(a);
            ul.appendChild(li);
        });
        this.navigation.innerHTML = '';
        this.navigation.appendChild(ul);
    }

    renderHome() {
        this.content.innerHTML = '<h1>Welcome to the Forum</h1>';
        if (currentUser) {
            this.content.innerHTML += `<p>Hello, ${currentUser.nickname}!</p>`;
        } else {
            this.content.innerHTML += '<p>Please login or register to participate in discussions.</p>';
        }
    }

    handleMessage(message, type) {
        navigate('home');
        if (Toastr[type]) {
            Toastr[type](message);
        } else {
            Toastr.info(message);
        }
    }
}