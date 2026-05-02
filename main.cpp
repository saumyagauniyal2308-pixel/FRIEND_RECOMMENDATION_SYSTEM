#include <iostream>
#include <vector>
#include <sstream>
#include "user.h"
#include "recommendation.h"
#include "token.h"

using namespace std;

vector<string> split(string s) {
    vector<string> res;
    stringstream ss(s);
    string temp;

    while(getline(ss, temp, ','))
        res.push_back(temp);

    return res;
}

struct Credentials {
    int id;
    string password;
};

int main() {
    vector<User> users;
    vector<Credentials> creds;

    User u1(1,"Rahul",22,"Delhi");
    u1.addInterest("coding");
    u1.addInterest("sports");

    User u2(2,"Aman",20,"Mumbai");
    u2.addInterest("gaming");
    u2.addInterest("coding");

    User u3(3,"Riya",21,"Delhi");
    u3.addInterest("music");
    u3.addInterest("coding");

    users.push_back(u1);
    users.push_back(u2);
    users.push_back(u3);

    int id, age;
    string name, location, intr, pass;

    cout << "\n--- USER REGISTRATION ---\n";
    cin >> id >> name >> age >> location >> intr >> pass;

    User current(id, name, age, location);

    vector<string> arr = split(intr);
    for(auto &x : arr)
        current.addInterest(x);

    users.push_back(current);
    creds.push_back({id, pass});

    cout << "\n--- LOGIN ---\n";
    int loginId;
    string loginPass;
    cin >> loginId >> loginPass;

    bool loginSuccess = false;

    for(auto &c : creds) {
        if(c.id == loginId && c.password == loginPass) {
            loginSuccess = true;
            break;
        }
    }

    if(!loginSuccess) {
        cout << "Login Failed!\n";
        return 0;
    }

    cout << "Login Successful!\n";

    for(auto &u : users) {
        if(u.getId() == loginId) {
            current = u;
            break;
        }
    }

    TokenSystem::dailyLogin(current);

    vector<User> rec = Recommendation::getTopK(current, users, 3);

    cout << "\n--- RECOMMENDED FRIENDS ---\n";

    for(auto &u : rec) {
        if(TokenSystem::deduct(current, 1)) {
            cout << "Name: " << u.getName() << endl;
            cout << "Location: " << u.getLocation() << endl;
            cout << "----------------------\n";
        }
    }

    cout << "\nRemaining Tokens: " << current.getTokens() << endl;

    return 0;
}