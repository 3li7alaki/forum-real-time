// chat.js


import {webSock} from "../websock.js";
import {fetchAPI} from "../api.js";
import { currentUser } from "../state.js";
import { timeSince } from "../utils.js";

export class Chat {
    constructor() {
        this.users = [];
        this.input = document.getElementById('chat-input');

        this.addTypingListener();
    }

    setUsers(users) {
        this.users = users;
        this.renderUsers();
    }

    renderUsers() { // TODO: Render users in chat
        const display = document.getElementById('chat-display');
        display.innerHTML = '';
        const usersList = document.createElement('div');
        usersList.id = 'users';
        usersList.innerHTML = '';
        display.appendChild(usersList)

        this.users.forEach( user => {
            const newDiv = document.createElement('div');
            const nickname = user.nickname;
            const time = user.last_messaged_at? new Date(user.last_messaged_at): null;
            const displayMsg = time? `Last Messaged ${timeSince(time)}`: `Say hello`;
            newDiv.classList.add("listDiv");
            newDiv.innerHTML = `<div class="nicknameInList"><span class="nickListSpan">${nickname + " "}</span></div>
                                <div class="lastMessagedInList">${displayMsg}</div>`;
            usersList.appendChild(newDiv);

            newDiv.onclick = () => {
                this.renderMessages(user.id)
            }

        });

        console.log('Rendering users:', this.users);
    }

    renderMessages(idMessaged){
        const backButton = document.createElement('div');
        const display = document.getElementById('chat-display');
        display.innerHTML = '';
        backButton.style.cursor = 'pointer';
        backButton.textContent = '< Back'
        backButton.id = 'chat-backButton'
        backButton.onclick = () => this.renderUsers();
        display.appendChild(backButton);
        const messagesDiv = document.createElement('div')

    }

    addTypingListener() {
        let isTyping = false;
        let typingTimer = null;
        let debounceDelay = 500;

        function debouncedTypingStart() {
            clearTimeout(typingTimer);
            if (!isTyping) {
                isTyping = true;
                webSock.typing("start");
            }
            typingTimer = setTimeout(() => {
                isTyping = false;
                webSock.typing("stop");
            }, debounceDelay);
        }

        this.input.addEventListener('input', debouncedTypingStart);

        this.input.addEventListener('blur', () => {
            clearTimeout(typingTimer);
            if (isTyping) {
                isTyping = false;
                webSock.typing("stop");
            }
        });
    }

    userTyping(user_id, status) {
        // TODO: Display user is typing
    }

    getMessages(user_id, limit = 10) {
        fetchAPI(`/messages`, 'GET', { user_id, limit })
            .then(messages => {
                console.log('Messages:', messages);
            });
    }
}