#ifndef RECOMMENDATION_H
#define RECOMMENDATION_H

#include <queue>
#include <vector>
#include "similarity.h"

class Recommendation {
public:

    static vector<User> getTopK(User &current,
                               vector<User> &users,
                               int k) {
        priority_queue<pair<double, int>> pq;

        for(int i=0;i<users.size();i++) {
            if(users[i].getId() == current.getId())
                continue;

            double score = Similarity::compute(current, users[i]);
            pq.push({score, i});
        }

        vector<User> res;

        while(!pq.empty() && k--) {
            int idx = pq.top().second;
            pq.pop();
            res.push_back(users[idx]);
        }

        return res;
    }
};

#endif