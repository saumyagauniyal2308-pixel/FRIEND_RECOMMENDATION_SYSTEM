#ifndef SIMILARITY_H
#define SIMILARITY_H

#include "user.h"
#include <cmath>

class Similarity {
public:

    static double jaccard(unordered_set<string> a,
                          unordered_set<string> b) {
        int inter = 0;

        for(auto &x : a)
            if(b.count(x)) inter++;

        int uni = a.size() + b.size() - inter;

        if(uni == 0) return 0;

        return (double)inter / uni;
    }

    static double compute(User &u1, User &u2) {
        double score = 0;

        score += 0.6 * jaccard(u1.getInterests(), u2.getInterests());

        if(u1.getLocation() == u2.getLocation())
            score += 0.2;

        score += 0.2 * (1.0 / (1 + abs(u1.getAge() - u2.getAge())));

        return score;
    }
};

#endif