// profile.js

import {navigate} from "../router.js";
import {previousPage, removeCurrentUser, setCurrentUser} from "../state.js";
import {fetchAPI} from "../api.js";
import Toastr from "../toastr.js";
import modal from "../modal.js";

export class Profile {

    constructor() {
        this.content = document.getElementById('content');
        window.renderEditProfile = this.renderEditProfile
        window.handleEditProfile = this.handleEditProfile
        window.handleRequestMod = this.handleRequestModerator
    }


    renderProfile() {
        fetchAPI('/profile')
            .then(profile => {
                this.content.innerHTML = `
            <h2>Profile</h2>
            <p>Nickname: ${profile.nickname}</p>
            <p>Age: ${profile.age}</p>
            <p>Gender: ${profile.gender}</p>
            <p>First Name: ${profile.first_name}</p>
            <p>Last Name: ${profile.last_name}</p>
            <p>Email: ${profile.email}</p>
            <p>Role: ${profile.type}</p>
          `;
                const button = document.createElement('button');
                button.textContent = 'Edit Profile';
                button.onclick = () => this.renderEditProfile();
                this.content.appendChild(button);

                if (profile.type === 'user') {
                    const requestModButton = document.createElement('button');
                    requestModButton.textContent = profile.requested ? 'Requested' : 'Request Moderator';
                    requestModButton.disabled = profile.requested;

                    requestModButton.onclick = () => this.handleRequestModerator();
                    this.content.appendChild(requestModButton);
                }

            }).catch(error => {
                if (error.message !== 'Unauthorized') {
                    Toastr.error('Error fetching profile');
                }
            });
    }

    renderEditProfile() {
        console.log('renderEditProfile');
        fetchAPI('/profile')
            .then(profile => {
                this.content.innerHTML = `
            <h2>Edit Profile</h2>
            <form id="edit-profile-form">
              <label for="nickname">Nickname:</label>
              <input type="text" id="nickname" name="nickname" value="${profile.nickname}" required>
              <label for="age">Age:</label>
              <input type="number" id="age" name="age" value="${profile.age}" min="13" max="99" required>
              <label for="gender">Gender:</label>
              <select id="gender" name="gender" required>
              <option value="Male" ${profile.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option>
              </select>
              <label for="first_name">First Name:</label>
              <input type="text" id="first_name" name="first_name" value="${profile.first_name}" required>
              <label for="last_name">Last Name:</label>
              <input type="text" id="last_name" name="last_name" value="${profile.last_name}" required>
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" value="${profile.email}" required>
              <label for="password">Password:</label>
              <input type="password" id="password" name="password">
              <label for="confirm-password">Confirm Password:</label>
              <input type="password" id="confirm-password" name="confirm-password">
              <button type="submit">Save</button>
            </form>
          `;
                document.getElementById('edit-profile-form').addEventListener('submit', this.handleEditProfile);
            }).catch(error => {
                if (error.message !== 'Unauthorized') {
                    Toastr.error('Error fetching profile');
                }
            });
    }

    handleEditProfile(event) {
        event.preventDefault();
        const nickname = document.getElementById('nickname').value;
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const first_name = document.getElementById('first_name').value;
        const last_name = document.getElementById('last_name').value;
        const email = document.getElementById('email').value;

        let body = { nickname, age, gender, first_name, last_name, email };

        const password = document.getElementById('password').value;
        const confirm_password = document.getElementById('confirm-password').value;

        if (password && confirm_password) {
            body = { ...body, password, confirm_password };
        } else if (password || confirm_password) {
            Toastr.error('Password and Confirm Password must be both filled');
            return;
        }

        function edit() {
            fetchAPI('/profile', 'PUT', body)
                .then(profile => {
                    setCurrentUser(profile);
                    Toastr.success('Profile updated');
                    navigate('profile');
                }).catch(error => {
                    Toastr.error(error.message);
                });
        }

        modal.show('Are you sure you want to update your profile?', edit);
    }

    handleRequestModerator() {
        fetchAPI('/requests', 'POST')
            .then(() => {
                Toastr.success('Request sent');
                navigate('profile');
            }).catch(error => {
                Toastr.error(error.message);
            });
    }
}