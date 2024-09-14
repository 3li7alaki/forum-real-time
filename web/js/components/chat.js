// chat.js
import { currentUser } from "../state.js";
import { timeSince } from "../utils.js";
export class Chat {
    constructor() {
        this.users = [];
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
}