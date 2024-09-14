// chat.js

export class Chat {
    constructor() {
        this.users = [];
    }

    setUsers(users) {
        this.users = users;
        this.renderUsers();
    }

    addUser(user) {
        this.users.push(user);
        this.renderUsers();
    }

    renderUsers() {
        // TODO: Render users in chat
    }
}