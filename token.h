#ifndef TOKEN_H
#define TOKEN_H

#include "user.h"
#include <iostream>

class TokenSystem {
public:

    static bool deduct(User &u, int cost) {
        if(u.getTokens() >= cost) {
            u.setTokens(u.getTokens() - cost);
            return true;
        }
        cout << "Not enough tokens!\n";
        return false;
    }

    static void reward(User &u, int val) {
        u.setTokens(u.getTokens() + val);
    }

    static void dailyLogin(User &u) {
        cout << "Daily login reward +2 tokens\n";
        reward(u, 2);
    }

    static void inviteReward(User &u) {
        cout << "Invite reward +5 tokens\n";
        reward(u, 5);
        u.increaseInvite();
    }

    static void mutualReward(User &u1, User &u2) {
        reward(u1, 3);
        reward(u2, 3);
        cout << "Mutual reward given!\n";
    }
};

#endif