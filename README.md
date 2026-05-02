# FRIEND_RECOMMENDATION_SYSTEM
A DAA project implementing a social friend-recommendation system using greedy scoring on shared interests. Features a token economy (earn/spend tokens), friend requests, real-time chat, C++ algorithm core, and a Node.js + SQLite web app frontend.
A social networking mini-app built as a DAA (Design and Analysis of Algorithms) project. It combines a C++ backend logic with a Node.js/SQLite web app to demonstrate graph-based friend recommendations and a token economy.

Features

User Registration & Login — Secure credential-based auth stored in SQLite
Friend Recommendations — Top-K friend suggestions based on shared interests and location
Token System — Earn tokens on daily login, spend to view recommendations or send requests
Friend Requests — Send, accept, and manage friend connections
Real-time Chat — In-app messaging between connected users
Web UI — Responsive frontend served via Node.js Express


Project Structure
B_DAA/
└── friend-recommendation-tokens/
    ├── main.cpp        # C++ CLI demo (registration, login, token flow)
    ├── friend.h        # FriendSystem class (requests, token deduction)
    ├── app.js          # Frontend JS (login, recommendations, chat)
    ├── db.js           # SQLite database helpers
    ├── index.html      # Web UI
    └── groupy.db       # SQLite database


    C++ — Core algorithm logic
Node.js + Express — REST API backend
SQLite — Persistent data storage
Vanilla JS + HTML/CSS — Frontend UI
