#ifndef FRIEND_H
#define FRIEND_H

#include <unordered_map>
#include <vector>
#include <iostream>
#include "user.h"
#include "token.h"

using namespace std;

class FriendSystem {
private:
    unordered_map<int, vector<int>> friends;
    unordered_map<int, vector<int>> requests;

public:

    void sendRequest(User &sender, User &receiver) {
        if(!TokenSystem::deduct(sender, 2))
            return;

        requests[receiver.getId()].push_back(sender.getId());

        cout << sender.getName() << " sent request to "
             << receiver.getName() << endl;
    }

    void acceptRequest(User &receiver, User &sender) {
        friends[receiver.getId()].push_back(sender.getId());
        friends[sender.getId()].push_back(receiver.getId());

        TokenSystem::mutualReward(receiver, sender);

        cout << "Friend added!\n";
    }

    void showFriends(int id) {
        cout << "Friends: ";
        for(int f : friends[id])
            cout << f << " ";
        cout << endl;
    }
};

#endif