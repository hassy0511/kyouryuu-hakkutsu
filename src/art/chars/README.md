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

## Hakase constants

Edit `HAKASE_MOTION` in `hakase.ts`:

| Constant            | Default | Purpose                      |
| ------------------- | ------: | ---------------------------- |
| `breathingScale`    | `0.009` | Idle breathing scale         |
| `nodRadians`        |  `2.2°` | Slow nod amplitude           |
| `headTiltRadians`   |  `1.2°` | Gentle head-tilt amplitude   |
| `armWelcomeRadians` |  `2.5°` | Notebook-holding arm gesture |

Hakase is an idle-only rig. The white coat, yellow hat, white beard, and notebook are the main silhouette cues.
