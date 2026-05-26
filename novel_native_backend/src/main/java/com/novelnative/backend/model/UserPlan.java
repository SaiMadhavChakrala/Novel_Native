package com.novelnative.backend.model;

public enum UserPlan {
    NORMAL("normal"),
    PREMIUM("premium");

    private final String jsonValue;

    UserPlan(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    public String jsonValue() {
        return jsonValue;
    }

    public static UserPlan fromDatabaseValue(String value) {
        return "premium".equals(value) ? PREMIUM : NORMAL;
    }
}
