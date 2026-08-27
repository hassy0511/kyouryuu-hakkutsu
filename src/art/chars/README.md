# Character animation tuning

Character builders own their child-part animation. The game controls only the returned root group's world position and `rotation.y`.

## Player constants

Edit `PLAYER_MOTION` in `player.ts`:

| Constant             | Default | Purpose                                     |
| -------------------- | ------: | ------------------------------------------- |
| `strideMeters`       |   `0.5` | Converts movement speed to walk phase       |
| `legSwingRadians`    |   `33°` | Hip swing amplitude                         |
| `armSwingRadians`    |   `18°` | Opposite-phase shoulder swing               |
| `forwardLeanRadians` |    `5°` | Walking lean toward +Z                      |
| `bodyBobMeters`      | `0.008` | Torso-only vertical motion; stays below 2cm |
| `blendSeconds`       |   `0.2` | Walk/idle blend time                        |
| `breathingScale`     |  `0.01` | Idle breathing scale                        |
