// chat.js


import {webSock} from "../websock.js";
import {fetchAPI} from "../api.js";
import { currentUser } from "../state.js";
import { timeSince } from "../utils.js";
import Toastr from "../toastr.js";

export class Chat {
    constructor() {
        this.users = [];
        this.messages = [];
        this.currentReceiver = null;

        // this.addTypingListener();
    }

    setUsers(users) {
        this.users = users;
        this.renderUsers();
    }

    renderUsers() {
        this.messages = [];
        this.currentReceiver = null;
        this.users = this.users.sort((a, b) => {
            return new Date(b.last_messaged_at) - new Date(a.last_messaged_at);
        });

        const display = document.getElementById('chat-display');
        display.innerHTML = '';
        const usersList = document.createElement('div');
        usersList.id = 'users';
        usersList.innerHTML = '';
        display.appendChild(usersList)

        this.users?.forEach( user => {
            const userDiv = document.createElement('div');
            const nickname = user.nickname;
            const time = user.last_messaged_at? new Date(user.last_messaged_at): null;
            const displayMsg = time? `Last Messaged ${timeSince(time)}`: `Say hello`;
            userDiv.classList.add("listDiv");
            userDiv.innerHTML = `<div class="nicknameInList"><span class="nickListSpan">${nickname + " "}</span></div>
                                <div class="lastMessagedInList">${displayMsg}</div>`;
            usersList.appendChild(userDiv);

            userDiv.onclick = () => {
                this.currentReceiver = user;
                this.renderChat(user.id)
            }

        });

    }

    renderChat(idMessaged){
        const display = document.getElementById('chat-display');
        if(!display){
            console.log("Chat display error.");
            return;
        }

        const backButton = document.createElement('div');
        display.innerHTML = '';
        backButton.style.cursor = 'pointer';
        backButton.textContent = '< Back';
        backButton.id = 'chat-backButton';
        backButton.onclick = () => {
            this.renderUsers();
            this.currentReceiver = null;
        };
        display.appendChild(backButton);

        const messagesDiv = document.createElement('div');
        messagesDiv.id = 'messages-display';
        display.appendChild(messagesDiv);

        this.getMessages(idMessaged).then(data => {
            this.messages = data;
            this.renderMessages(idMessaged);
        }).catch(err => {
            console.log(err)
            Toastr.error('Error getting Messages');
        })

        const inputForm = document.createElement('form');
        inputForm.innerHTML = `<input name="msg-input" type="text" placeholder="Type something..." />
                               <button type="submit">AYO</button>`;
        inputForm.id = 'message-form';
        inputForm.addEventListener('submit', event => {
            event.preventDefault();
            const userForm = new FormData(inputForm);
            const userMsg = userForm.get('msg-input');
            if (userMsg.replace(/ /g, "") === ""){
                return;
            }
            inputForm.reset();
            this.sendMessage(userMsg);


        });    
        display.appendChild(inputForm);

    }
    renderMessages(idMessaged, appended = false, scrolled = false){

        const messagesDiv =  document.getElementById('messages-display');
        if (appended){
            messagesDiv.appendChild(this.divMsg(idMessaged, this.messages[this.messages.length-1]));
            return;
        }

        this.messages.slice().reverse().forEach(msg => {
            
            messagesDiv.appendChild(this.divMsg(idMessaged, msg));
        })
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    divMsg(idMessaged, msgInfo) {
        const loadMsg = document.createElement('div');
        const senderID = msgInfo.sender_id? msgInfo.sender_id: msgInfo.user_id
        if (senderID === idMessaged){
            loadMsg.classList.add('sMsg'); //sender message
        } else {
            loadMsg.classList.add('mMsg'); //my message
        }
        loadMsg.textContent = msgInfo.content;
        return loadMsg;
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
        return fetchAPI(`/messages?user_id=${user_id}&limit=${limit}`);
    }

    receiveMessage(message) {
        this.users.forEach(user => {
            if (user.id === message.user_id) {
                user.last_messaged_at = message.time; //MESSAGE.TIME DOES NOT EXIST AS part of the object.
                this.renderUsers()
            }
        })


        if (this.currentReceiver?.id === message.user_id) {
            
            this.messages.push(message);
            this.renderMessages(this.currentReceiver.id, true);
        } else {
            console.log(message)
            Toastr.info('New message from ' + message.receiver_id);

            if (!this.currentReceiver) {
                this.renderUsers();
            }
        }
    }


    sendMessage(content) {
        if (!this.currentReceiver) {
            Toastr.error('Select a user to send message to');
            return;
        }
    
        const body = { content: content, receiver_id: this.currentReceiver.id };
        fetchAPI('/messages', 'POST', body).then(data => {
            this.messages.push(data);
            this.renderMessages(this.currentReceiver.id, true);

            webSock.message(content, this.currentReceiver.id);
        }).catch(err => {
            Toastr.error('Failed to send message');
            console.log("Message Error: ", err);
        });
    }

    removeChats() {
        this.users = [];
        this.messages = [];
        this.currentReceiver = null;

        const display = document.getElementById('chat-display');
        if (display){
            display.innerHTML = '';
        };
    }
}


    