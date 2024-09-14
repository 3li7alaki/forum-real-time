// main.js
import {navigate} from './router.js';
import {currentPage, currentUser, setCurrentUser} from "./state.js";
import {SessionChecker} from "./session.js";
import {WebSock} from "./websock.js";

function initApp() {
    
    if (currentUser) {    
        setCurrentUser(currentUser);
        SessionChecker.check();
    }

    navigate(currentPage);
    window.navigate = navigate;

    const sock = new WebSock();
}

document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('popstate', (event) => {
    const page = event.state?.page || '/';
    navigate(page);
});