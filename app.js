// =====================
// CONFIG
// =====================
const API = "http://localhost:3000";

// =====================
// GLOBAL STATE
// =====================
let userTokens = 0;
let currentUserId = null;
let currentUserData = null;
let activeChatUserId = null;

// =====================
// ELEMENTS
// =====================
const loginBtn = document.getElementById('loginBtn');
const tokenBalanceEl = document.getElementById('tokenBalance');
const loginOverlay = document.getElementById('loginOverlay');
const mainApp = document.getElementById('mainApp');
const recGrid = document.getElementById('recommendationsGrid');
const loginError = document.getElementById('loginError');

// =====================
// LOGIN
// =====================
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const name = document.getElementById('loginId').value.trim();
        const password = document.getElementById('loginPass').value;

        if (!name || !password) {
            loginError.innerText = "Enter username and password";
            return;
        }

        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password })
            });

            const data = await res.json();

            if (!res.ok) {
                loginError.innerText = data.error;
                return;
            }

            currentUserId = data.id;
            userTokens = data.tokens;
            currentUserData = data;

            tokenBalanceEl.innerText = userTokens;
            updateUserProfile(data);

            loginOverlay.style.display = 'none';
            mainApp.style.display = 'flex';

            // Update notification badge
            if (data.pendingRequests > 0) {
                const badge = document.getElementById('notifBadge');
                badge.style.display = 'flex';
                badge.innerText = data.pendingRequests;
            }

            loadRecommendations(currentUserId);
            loadChatFriends();
            loadTasks();

        } catch (err) {
            loginError.innerText = "Backend not running! Start with: npm start";
        }
    });
}

// =====================
// UPDATE USER PROFILE IN UI
// =====================
function updateUserProfile(data) {
    document.getElementById('sidebarUserName').innerText = data.name;
    document.getElementById('profileNameInput').value = data.name;
    document.getElementById('profileStatusInput').value = data.location || '';
    document.getElementById('profileTokensStat').innerText = data.tokens;
    document.getElementById('profileConnectionsStat').innerText = data.connections || 0;

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=10b981&color=fff`;
    document.getElementById('sidebarAvatar').src = avatarUrl;
    document.getElementById('modalAvatarPreview').src = avatarUrl;

    // Render interests
    const container = document.getElementById('userInterestsContainer');
    container.innerHTML = '';
    if (data.interests) {
        data.interests.split(',').filter(i => i.trim()).forEach(interest => {
            const tag = document.createElement('span');
            tag.className = 'interest-tag';
            tag.innerHTML = `${interest.trim()} <span class="remove-interest" data-interest="${interest.trim()}">&times;</span>`;
            container.appendChild(tag);
        });
    }

    // Bind remove handlers
    container.querySelectorAll('.remove-interest').forEach(btn => {
        btn.addEventListener('click', () => {
            const toRemove = btn.dataset.interest;
            const arr = currentUserData.interests.split(',').map(i => i.trim()).filter(i => i && i !== toRemove);
            currentUserData.interests = arr.join(',');
            updateUserProfile(currentUserData);
        });
    });
}

// =====================
// LOAD RECOMMENDATIONS
// =====================
async function loadRecommendations(userId) {
    recGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #888;">Loading recommendations...</div>';

    try {
        const res = await fetch(`${API}/recommend/${userId}`);
        const data = await res.json();

        if (!res.ok) {
            recGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #f87171;">Failed to load recommendations</div>';
            return;
        }

        recGrid.innerHTML = "";

        if (data.length === 0) {
            recGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #888;">No recommendations found. Register more users!</div>';
            return;
        }

        data.forEach(user => {
            const card = document.createElement("div");
            card.className = "card neon-border";
            card.style.padding = "1.5rem";
            card.style.borderRadius = "12px";
            card.style.cursor = "pointer";

            const interestsList = user.interests
                ? user.interests.split(',').map(i => i.trim()).join(', ')
                : 'No interests';

            const btnLabel = user.isPending ? '⏳ Request Pending' : 'Connect (-2 Points)';
            const btnDisabled = user.isPending ? 'disabled' : '';
            const btnBg = user.isPending ? '#666' : '#10b981';

            card.innerHTML = `
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem;">${user.name}</h3>
                <p style="margin: 0.5rem 0; color: #888; font-size: 0.9rem;">📍 ${user.location || 'Unknown'}</p>
                <p style="margin: 0.5rem 0; color: #10b981; font-size: 0.85rem;">⚙️ ${interestsList}</p>
                <p style="margin: 0.5rem 0; color: #fbbf24; font-size: 0.85rem;">💯 Match: ${Math.round(user.score * 100)}%</p>
                <button ${btnDisabled} onclick="connectUser(${user.id}, this)" style="margin-top: 1rem; width: 100%; padding: 0.5rem; background: ${btnBg}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    ${btnLabel}
                </button>
            `;

            recGrid.appendChild(card);
        });

    } catch (err) {
        recGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #f87171;">Server error - Backend not running?</div>';
    }
}

// =====================
// CONNECT USER
// =====================
async function connectUser(id, btn) {
    btn.disabled = true;
    btn.innerText = "Sending...";

    try {
        const res = await fetch(`${API}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: currentUserId, to: id })
        });

        const data = await res.json();

        if (data.error) {
            showToast(data.error, 'error');
            btn.disabled = false;
            btn.innerText = "Connect (-2 Points)";
            return;
        }

        userTokens = data.tokens;
        tokenBalanceEl.innerText = userTokens;
        document.getElementById('profileTokensStat').innerText = userTokens;
        btn.innerText = "⏳ Request Pending";
        btn.style.background = '#666';
        showToast(data.message || "Connection request sent!");

    } catch (err) {
        showToast("Connection failed!", 'error');
        btn.disabled = false;
        btn.innerText = "Connect (-2 Points)";
    }
}

// =====================
// NOTIFICATION BELL → SHOW REQUESTS
// =====================
document.querySelector('.notif-btn')?.addEventListener('click', async () => {
    if (!currentUserId) return;

    try {
        const res = await fetch(`${API}/requests/${currentUserId}`);
        const requests = await res.json();

        const list = document.getElementById('incomingRequestsList');
        list.innerHTML = '';

        if (requests.length === 0) {
            list.innerHTML = '<p style="color: #888; text-align: center;">No pending requests.</p>';
        } else {
            requests.forEach(req => {
                const el = document.createElement('div');
                el.style.cssText = 'display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid #30363d;';
                el.innerHTML = `
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(req.name)}&background=8b5cf6&color=fff" style="width: 40px; height: 40px; border-radius: 50%;">
                    <div style="flex:1;">
                        <p style="margin:0; font-weight:600;">${req.name}</p>
                        <p style="margin:0; font-size:0.8rem; color:#888;">📍 ${req.location || 'Unknown'}</p>
                    </div>
                    <button onclick="respondRequest(${req.requestId}, 'accept', this.parentElement)" class="btn btn-primary neon-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Accept</button>
                    <button onclick="respondRequest(${req.requestId}, 'reject', this.parentElement)" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Decline</button>
                `;
                list.appendChild(el);
            });
        }

        const modal = document.getElementById('requestsModal');
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal').style.transform = 'scale(1)';
        }, 10);

    } catch (err) {
        showToast("Failed to load requests", 'error');
    }
});

document.getElementById('closeRequestsBtn')?.addEventListener('click', () => {
    document.getElementById('requestsModal').style.display = 'none';
});

// =====================
// RESPOND TO REQUEST
// =====================
async function respondRequest(requestId, action, parentEl) {
    try {
        const res = await fetch(`${API}/requests/${requestId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });

        const data = await res.json();
        showToast(data.message);

        if (action === 'accept') {
            // Refresh tokens (+3 mutual reward)
            const userRes = await fetch(`${API}/user/${currentUserId}`);
            const userData = await userRes.json();
            userTokens = userData.tokens;
            tokenBalanceEl.innerText = userTokens;
            document.getElementById('profileTokensStat').innerText = userTokens;
            loadChatFriends();
        }

        parentEl.remove();

        // Update badge count
        const badge = document.getElementById('notifBadge');
        const remaining = document.getElementById('incomingRequestsList').children.length;
        if (remaining === 0) {
            badge.style.display = 'none';
            document.getElementById('incomingRequestsList').innerHTML = '<p style="color: #888; text-align: center;">No pending requests.</p>';
        } else {
            badge.innerText = remaining;
        }

    } catch (err) {
        showToast("Failed to respond", 'error');
    }
}

// =====================
// TAB NAVIGATION
// =====================
document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click', function() {
        const tab = this.getAttribute('data-tab');

        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

        this.classList.add('active');
        document.getElementById(tab + 'Content')?.classList.add('active');
    });
});

// =====================
// PROFILE MODAL
// =====================
const userProfileCard = document.getElementById('userProfileCard');
const profileModal = document.getElementById('profileModal');
const closeProfileIconBtn = document.getElementById('closeProfileIconBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');

if (userProfileCard) {
    userProfileCard.addEventListener('click', () => {
        profileModal.style.display = 'flex';
    });
}

if (closeProfileIconBtn) {
    closeProfileIconBtn.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });
}

// Add interest button
document.getElementById('addInterestBtn')?.addEventListener('click', () => {
    const input = document.getElementById('newInterestInput');
    const val = input.value.trim();
    if (!val) return;

    const existing = currentUserData.interests ? currentUserData.interests.split(',').map(i => i.trim()).filter(i => i) : [];
    if (!existing.includes(val)) {
        existing.push(val);
        currentUserData.interests = existing.join(',');
        updateUserProfile(currentUserData);
    }
    input.value = '';
});

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const name = document.getElementById('profileNameInput').value;
        const location = document.getElementById('profileStatusInput').value;

        try {
            const res = await fetch(`${API}/user/${currentUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    location,
                    age: currentUserData.age,
                    interests: currentUserData.interests
                })
            });

            if (res.ok) {
                showToast("Profile updated!");
                currentUserData.name = name;
                currentUserData.location = location;
                document.getElementById('sidebarUserName').innerText = name;
                profileModal.style.display = 'none';
                loadRecommendations(currentUserId);
            }
        } catch (err) {
            showToast("Failed to update profile", 'error');
        }
    });
}

// =====================
// TOAST NOTIFICATIONS
// =====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const icon = toast.querySelector('.toast-icon i');

    toastMessage.innerText = message;
    if (type === 'error') {
        icon.className = 'fa-solid fa-circle-exclamation';
        toast.style.borderColor = '#f87171';
    } else {
        icon.className = 'fa-solid fa-check-circle';
        toast.style.borderColor = '';
    }

    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// =====================
// CHAT — LOAD FRIENDS
// =====================
async function loadChatFriends() {
    const chatFriendsList = document.getElementById('chatFriendsList');

    try {
        const res = await fetch(`${API}/friends/${currentUserId}`);
        const friends = await res.json();

        chatFriendsList.innerHTML = '';

        if (friends.length === 0) {
            chatFriendsList.innerHTML = '<p style="padding: 1.5rem; color: #888; text-align: center; font-size: 0.9rem;">No connections yet.<br>Send requests from Discover!</p>';
            return;
        }

        friends.forEach(friend => {
            const friendEl = document.createElement('div');
            friendEl.style.cssText = 'padding: 1rem; border-bottom: 1px solid #30363d; cursor: pointer; display: flex; align-items: center; gap: 1rem; transition: background 0.2s;';
            friendEl.onmouseover = () => friendEl.style.background = 'rgba(16, 185, 129, 0.1)';
            friendEl.onmouseout = () => friendEl.style.background = activeChatUserId === friend.id ? 'rgba(16, 185, 129, 0.15)' : 'transparent';

            friendEl.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=8b5cf6&color=fff"
                     style="width: 40px; height: 40px; border-radius: 50%;">
                <div style="flex: 1;">
                    <p style="margin: 0; font-weight: 500;">${friend.name}</p>
                    <p style="margin: 0; font-size: 0.85rem; color: #888;">Connected</p>
                </div>
            `;

            friendEl.addEventListener('click', () => {
                activeChatUserId = friend.id;
                document.getElementById('activeChatName').innerText = friend.name;
                document.getElementById('activeChatAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=8b5cf6&color=fff`;
                loadChatMessages(friend.id);
            });

            chatFriendsList.appendChild(friendEl);
        });

        // Auto-select first friend
        if (friends.length > 0 && !activeChatUserId) {
            activeChatUserId = friends[0].id;
            document.getElementById('activeChatName').innerText = friends[0].name;
            document.getElementById('activeChatAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friends[0].name)}&background=8b5cf6&color=fff`;
            loadChatMessages(friends[0].id);
        }

    } catch (err) {
        console.error('Failed to load chat friends');
    }
}

// =====================
// CHAT — LOAD MESSAGES
// =====================
async function loadChatMessages(friendId) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '<div style="text-align: center; color: #888; padding: 2rem;">Loading...</div>';

    try {
        const res = await fetch(`${API}/messages/${currentUserId}/${friendId}`);
        const messages = await res.json();

        chatMessages.innerHTML = '';

        if (messages.length === 0) {
            chatMessages.innerHTML = '<div style="text-align: center; color: #555; padding: 2rem; font-size: 0.9rem;">No messages yet. Say hello! 👋</div>';
            return;
        }

        messages.forEach(msg => {
            const isMine = msg.sender_id === currentUserId;
            const msgEl = document.createElement('div');
            msgEl.style.cssText = `align-self: ${isMine ? 'flex-end' : 'flex-start'}; background: ${isMine ? '#10b981' : '#30363d'}; padding: 0.75rem 1rem; border-radius: 8px; max-width: 70%; word-wrap: break-word;`;
            msgEl.innerText = msg.content;
            chatMessages.appendChild(msgEl);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        chatMessages.innerHTML = '<div style="text-align: center; color: #f87171; padding: 2rem;">Failed to load messages</div>';
    }
}

// =====================
// CHAT — SEND MESSAGE
// =====================
const chatSendBtn = document.getElementById('chatSendBtn');
const chatInput = document.getElementById('chatInput');

if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', async () => {
        const message = chatInput.value.trim();
        if (!message || !activeChatUserId) return;

        // Optimistic UI update
        const chatMessages = document.getElementById('chatMessages');
        const msgEl = document.createElement('div');
        msgEl.style.cssText = 'align-self: flex-end; background: #10b981; padding: 0.75rem 1rem; border-radius: 8px; max-width: 70%; word-wrap: break-word;';
        msgEl.innerText = message;
        chatMessages.appendChild(msgEl);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Remove "no messages" placeholder
        const placeholder = chatMessages.querySelector('div[style*="text-align: center"]');
        if (placeholder) placeholder.remove();

        try {
            await fetch(`${API}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: currentUserId,
                    receiver_id: activeChatUserId,
                    content: message
                })
            });
        } catch (err) {
            showToast("Failed to send message", 'error');
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') chatSendBtn.click();
    });
}

// =====================
// TASKS / EARN POINTS
// =====================
function loadTasks() {
    const tasksGrid = document.getElementById('tasksGrid');
    if (!tasksGrid) return;

    const tasks = [
        { key: 'daily_login', title: 'Daily Login', description: 'Log in every day', reward: 2 },
        { key: 'complete_profile', title: 'Complete Profile', description: 'Fill in your full profile', reward: 10 },
        { key: 'add_interests', title: 'Add 3 Interests', description: 'Add 3 interests to your profile', reward: 5 },
        { key: 'send_connections', title: 'Connect with Someone', description: 'Send 5 connection requests', reward: 8 }
    ];

    tasksGrid.innerHTML = '';
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'card neon-border';
        card.style.padding = '1.5rem';
        card.innerHTML = `
            <h3 style="margin: 0 0 0.5rem 0;">${task.title}</h3>
            <p style="margin: 0 0 1rem 0; color: #888; font-size: 0.9rem;">${task.description}</p>
            <p style="color: #fbbf24; font-weight: bold; margin-bottom: 1rem;">+${task.reward} Points</p>
            <button onclick="claimTask('${task.key}', ${task.reward}, this)" style="width: 100%; padding: 0.5rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                Claim Reward
            </button>
        `;
        tasksGrid.appendChild(card);
    });
}

async function claimTask(taskKey, reward, btn) {
    btn.disabled = true;
    btn.innerText = 'Claiming...';

    try {
        const res = await fetch(`${API}/tasks/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId, task_key: taskKey, reward })
        });

        const data = await res.json();

        if (data.error) {
            showToast(data.error, 'error');
            btn.disabled = false;
            btn.innerText = 'Claim Reward';
            return;
        }

        userTokens = data.tokens;
        tokenBalanceEl.innerText = userTokens;
        document.getElementById('profileTokensStat').innerText = userTokens;
        btn.innerText = '✅ Claimed';
        btn.style.background = '#666';
        showToast(data.message);

    } catch (err) {
        showToast("Failed to claim", 'error');
        btn.disabled = false;
        btn.innerText = 'Claim Reward';
    }
}

// =====================
// REWARDS SHOP
// =====================
const storeGrid = document.getElementById('storeGrid');
if (storeGrid) {
    const rewards = [
        { title: 'Premium Badge', description: 'Show off as premium member', cost: 50 },
        { title: 'Profile Boost', description: 'Get featured in recommendations', cost: 30 },
        { title: 'Message Unlock', description: 'Send unlimited messages', cost: 20 },
        { title: 'Visibility Boost', description: 'Appear in more profiles', cost: 25 }
    ];

    rewards.forEach(reward => {
        const card = document.createElement('div');
        card.className = 'card neon-border';
        card.style.padding = '1.5rem';
        card.innerHTML = `
            <h3 style="margin: 0 0 0.5rem 0;">${reward.title}</h3>
            <p style="margin: 0 0 1rem 0; color: #888; font-size: 0.9rem;">${reward.description}</p>
            <button onclick="buyReward('${reward.title}', ${reward.cost}, this)" style="width: 100%; padding: 0.5rem; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                Buy - ${reward.cost} Points
            </button>
        `;
        storeGrid.appendChild(card);
    });
}

async function buyReward(title, cost, btn) {
    btn.disabled = true;
    btn.innerText = 'Buying...';

    try {
        const res = await fetch(`${API}/rewards/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId, reward_title: title, cost })
        });

        const data = await res.json();

        if (data.error) {
            showToast(data.error, 'error');
            btn.disabled = false;
            btn.innerText = `Buy - ${cost} Points`;
            return;
        }

        userTokens = data.tokens;
        tokenBalanceEl.innerText = userTokens;
        document.getElementById('profileTokensStat').innerText = userTokens;
        btn.innerText = '✅ Purchased';
        btn.style.background = '#666';
        showToast(`✅ ${data.message}`);

    } catch (err) {
        showToast("Purchase failed!", 'error');
        btn.disabled = false;
        btn.innerText = `Buy - ${cost} Points`;
    }
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay')) {
        e.target.style.display = 'none';
    }
});
