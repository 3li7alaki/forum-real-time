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
        this.messagesDiv = null;
        // this.addTypingListener();
        this.throttleToastr = this.throttle((userSending) => {
            Toastr.info('New message from ' + userSending);
        }, 1500);
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
        document.getElementById('chat-section').style.display = 'flex';
        const display = document.getElementById('chat-display');
        display.innerHTML = '';
        const usersList = document.createElement('div');
        usersList.id = 'users';
        usersList.innerHTML = '';
        display.appendChild(usersList)

        this.users?.forEach( (user, ind) => {
            const userDiv = document.createElement('div');
            const nickname = user.nickname;
            const time = user.last_messaged_at? new Date(user.last_messaged_at): null;
            const displayMsg = time? `Last Messaged ${timeSince(time)}`: `- Say hello`;
            userDiv.classList.add("listDiv");
            userDiv.innerHTML = `<div class="nicknameInList" id="user-${ind}-nickname"><span class="nickListSpan">${nickname}</span></div>
                                <div class="lastMessagedInList" id="user-${ind}-lastMsg">${displayMsg}</div>`;
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

        const flexBackName = document.createElement('div');
        flexBackName.id = 'flex-back-name';

        
        const nameType = document.createElement('div');
        nameType.id = 'name-typing';
        const typingYN = document.createElement('div');
        typingYN.id = 'typing-text-div'

        typingYN.innerHTML = 'typing...'.split('').map((l, i) => {
            l = `<span style='--i:${i+1};'>${l}</span>`;
            return l;
        }).join('');
        const userNickname = document.createElement('div');
        userNickname.id = 'chat-display-name';
        userNickname.textContent = this.currentReceiver.nickname;

        const backButton = document.createElement('div');
        
        display.innerHTML = '';
        backButton.style.cursor = 'pointer';
        backButton.textContent = '< Back';
        backButton.id = 'chat-backButton';
        backButton.onclick = () => {
            this.renderUsers();
            this.currentReceiver = null;
        };
        nameType.appendChild(userNickname)
        nameType.appendChild(typingYN)
        flexBackName.appendChild(backButton);
        flexBackName.appendChild(nameType);
        display.appendChild(flexBackName);

        const messagesDiv = document.createElement('div');
        messagesDiv.id = 'messages-display';
        display.appendChild(messagesDiv);
        this.addMsgScrollingListener(messagesDiv)

        this.getMessages(idMessaged).then(data => {
            this.messages = data;
            this.renderMessages(idMessaged);
        }).catch(err => {
            console.log(err)
            Toastr.error('Error getting Messages');
        })

        const inputForm = document.createElement('form');
        inputForm.innerHTML = `<input name="msg-input" id="msg-input" type="text" placeholder="Type something..." />
                               <button type="submit">Send</button>`;
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
        this.addTypingListener(document.getElementById('msg-input'))

    }

    renderMessages(idMessaged, appended = false, scrolled = false, range = 0){
        
        const messagesDiv =  document.getElementById('messages-display');
        if (appended){
            messagesDiv.appendChild(this.divMsg(idMessaged, this.messages[this.messages.length-1]));
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            return;
        }
        if (scrolled){
        
            this.messages.slice(this.messages.length - range).forEach(msg => {
                messagesDiv.prepend(this.divMsg(idMessaged, msg));
            })
            return;
        }
        messagesDiv.innerHTML = '';

        this.messages.slice().reverse().forEach(msg => {
            
            messagesDiv.appendChild(this.divMsg(idMessaged, msg));
        })
        if (!scrolled){
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    divMsg(idMessaged, msgInfo) {
        const loadMsg = document.createElement('div');
        const senderID = msgInfo.sender_id
        if (senderID === idMessaged){
            loadMsg.classList.add('sMsg'); //sender message
        } else {
            loadMsg.classList.add('mMsg'); //my message
        }
        loadMsg.textContent = msgInfo.content;
        return loadMsg;
    }

    getMessages(user_id, limit = 15) {
        return fetchAPI(`/messages?user_id=${user_id}&limit=${limit+this.messages.length}`);
    }

    receiveMessage(message) {
        let senderNick = "";
        this.users.forEach(user => {
            if (user.id === message.sender_id) {
                user.last_messaged_at = message.time;
                senderNick = user.nickname;
            }
        })

        if (this.currentReceiver?.id === message.sender_id) {
            this.messages.push(message);
            this.renderMessages(this.currentReceiver.id, true);
        } else {
            this.throttleToastr(senderNick);

            if (!this.currentReceiver) {
                this.renderUsers();
            }
        }
    }
    
    throttle(callback, delay = 1000){
        let shouldWait = false;
        let waitingArgs;
        const timeoutFunc = () => {
            if(waitingArgs == null){
                shouldWait = false;
            } else {
                callback(...waitingArgs);

                waitingArgs = null;
                setTimeout(timeoutFunc, delay);
            }
        }

        return (...args) => {
            if (shouldWait){
                waitingArgs = args;
                return;
            }
            callback(...args);

            shouldWait = true;

            setTimeout(timeoutFunc, delay);
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
            this.users.forEach(user => {
                if (user.id === data.receiver_id) {
                    user.last_messaged_at = data.time;
                }
            })
    
            webSock.message(content, this.currentReceiver.id);
        }).catch(err => {
            Toastr.error('Failed to send message');
            console.log("Message Error: ", err);
        });
    }

    addMsgScrollingListener(msgDisplay){
        let counter = 0;
        let prevDivHeight;
        
        let throttleScrolling = this.throttle(()=> {
            if (this.currentReceiver.id){
                this.getMessages(this.currentReceiver.id).then(data => {
                    if (this.messages.length !== data.length){
                        const range = data.length - this.messages.length
                        prevDivHeight = msgDisplay.scrollHeight;
                        this.messages = data;
                        this.renderMessages(this.currentReceiver.id, false, true, range);
                        msgDisplay.scrollTop = msgDisplay.scrollHeight - prevDivHeight - 20;
                    } else {
                        throttleScrolling = () => {};
                    }
                }).catch(err => {
                    console.log(err)
                    Toastr.error('Error getting Messages');
                })
            }

        }, 250);

       

        msgDisplay.addEventListener("scroll", () =>{
            if (msgDisplay.scrollTop === 0){
                throttleScrolling();
            }
        })
    }


    addTypingListener(msgTextBox) {
        let isTyping = false;        
        let typingTimer;        
        let debounceDelay = 500;  //time in ms

        //on keyup, start the countdown
        msgTextBox.addEventListener('input', () => {
            clearTimeout(typingTimer);
            if (!isTyping) {
                isTyping = true;
                webSock.typing("start");
            } 
            typingTimer = setTimeout(() => {
                isTyping = false;
                webSock.typing("stop");
            }, debounceDelay);
        
        });

    }

    userTyping(user_id, status) {
        // TODO: Display user is typing
        if(!this.currentReceiver){
            this.users?.forEach((user, ind) => {
                
                if (user.id === user_id) {
                    const userInList = document.getElementById(`user-${ind}-lastMsg`);
                    if (status ==="start") {
                        userInList.innerHTML = '<b style="color:black;">Typing...</b>';

                    } else if (status ==="stop"){
                        const time = user.last_messaged_at? new Date(user.last_messaged_at): null;
                        userInList.innerHTML =  time? `Last Messaged ${timeSince(time)}`: `- Say hello`;
                    }
                }
            })
            return;
        }
        if(this.currentReceiver.id !== user_id){
            return;
        }

        if (status === "start"){
            this.enableTyping();
        }
        if(status === "stop"){
            this.disableTyping();
        }
    }

    disableTyping(){
        const typeDiv = document.getElementById('typing-text-div');
        typeDiv.style.display = 'none';
    }
    enableTyping(){
        const typeDiv = document.getElementById('typing-text-div');
        typeDiv.style.display = 'block';    
    }

    removeChats() {
        this.users = [];
        this.messages = [];
        this.currentReceiver = null;
        document.getElementById('chat-section').style.display = 'none';

        const display = document.getElementById('chat-display');
        if (display){
            display.innerHTML = '';
        };
    }

}


    