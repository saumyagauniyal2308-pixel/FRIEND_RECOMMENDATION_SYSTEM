#ifndef USER_H
#define USER_H

#include <iostream>
#include <unordered_set>
#include <string>
using namespace std;

class User {
private:
    int id;
    string name;
    int age;
    string location;
    unordered_set<string> interests;
    int tokens;
    int invitedCount;

public:
    User() {}

    User(int id, string name, int age, string location) {
        this->id = id;
        this->name = name;
        this->age = age;
        this->location = location;
        this->tokens = 10;
        this->invitedCount = 0;
    }

    void addInterest(string i) {
        interests.insert(i);
    }

    int getId() { return id; }
    string getName() { return name; }
    int getAge() { return age; }
    string getLocation() { return location; }
    int getTokens() { return tokens; }
    unordered_set<string> getInterests() { return interests; }

    void setTokens(int t) { tokens = t; }

    void increaseInvite() { invitedCount++; }
    int getInviteCount() { return invitedCount; }

    void display() {
        cout << "\nUser: " << name << endl;
        cout << "Age: " << age << " Location: " << location << endl;
        cout << "Interests: ";
        for(auto &i : interests) cout << i << " ";
        cout << "\nTokens: " << tokens << endl;
    }
};

#endif