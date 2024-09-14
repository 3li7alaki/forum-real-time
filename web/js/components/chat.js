// chat.js

export class Chat {
    constructor() {
        this.users = [];
    }

    setUsers(users) {
        this.users = users;
        this.renderUsers();
    }

    renderUsers() {
        // TODO: Render users in chat
        console.log('Rendering users:', this.users);
    }
}