export var AIState;
(function (AIState) {
    AIState[AIState["THINKING"] = 0] = "THINKING";
    AIState[AIState["AVOIDING"] = 1] = "AVOIDING";
})(AIState || (AIState = {}));
export var AIObjective;
(function (AIObjective) {
    AIObjective[AIObjective["ELIMINATE"] = 0] = "ELIMINATE";
    AIObjective[AIObjective["PLANT_BOMB"] = 1] = "PLANT_BOMB";
    AIObjective[AIObjective["DEFUSE_BOMB"] = 2] = "DEFUSE_BOMB";
    AIObjective[AIObjective["GET_POWERUP"] = 3] = "GET_POWERUP";
})(AIObjective || (AIObjective = {}));
export var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["Start"] = 0] = "Start";
    GameStatus[GameStatus["Playing"] = 1] = "Playing";
    GameStatus[GameStatus["RoundOver"] = 2] = "RoundOver";
    GameStatus[GameStatus["GameOver"] = 3] = "GameOver";
})(GameStatus || (GameStatus = {}));
export var GameMode;
(function (GameMode) {
    GameMode[GameMode["PVP"] = 0] = "PVP";
    GameMode[GameMode["PVE"] = 1] = "PVE";
    GameMode[GameMode["MULTIPLAYER"] = 2] = "MULTIPLAYER";
})(GameMode || (GameMode = {}));
