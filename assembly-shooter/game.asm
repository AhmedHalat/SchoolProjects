# Ahmed Halat
# halatahm

.data

displayAddress: .word 0x10008000
projectileLocation: .word 0xffffffff
white: .word 0xffffff
red: .word 0xb52628

# Obstacle Colors
brown: .word 0x987d39 # Asteroid
green: .word 0x87c45e # Decrease Difficulty
health: .word 0xab4040 # Heal

# First word handles location, second world is the type (Asteroid/Pickups) MAX: 15
obstacles:    .word   -34, 0, -72, 0, -1, 0, -72, 0, -111, 0, -37, 0, -111, 0, -52, 0, -111, 0, -37, 0, -65, 0, -14, 0, -111, 0, -111, 0, -111, 0
hits: .word 0 # Keeps track of the number of hits that occured in 1 loop. Used for erasing hearts more efficiently (so I dont have to erase all 15)

.text
.globl main

# Milestone 3 features
# - Increasing diffulty: As time passes, more obstacles will spawn,
#     everything will move faster (tick speed), and obstacles will gain a second
#     speed boost when diffulty reaches max (10 modifier)
# - Pickups: 2 pick-ups were added to the game,
#     - Health: a red ball, regain health for a max of 15
#     - Difficulty decrease: Green, Decease the diffulty modifier by 1 and reset the diff increase clock
# - Shooting: You gain the ability to shoot using spacebar
#     - When you shoot an Asteroid, they have a 60% chance of dropping a pickup

# Playing the game: WASD is used to move the character across the screen,
#   Use spacebar to fire projectiles if your cooldown allows you to

# DATA
# $s0: Our Display Address
# $s1: The player location
# $s3: Number of obstacles (max 8)
# $s4: Difficulty Counter
# $s5: Lives
# $s6: Previous player position
# $s7: Program Increment
main:
  lw $s0, displayAddress # $s0 stores the base address for display
  addi  $s1, $s0, 4128      # Spawn player in center-left screen
  addi  $s6, $s0, 4120      # Set Last player location for render

  addi  $s3, $0, 5      # Start with 3 obstacles
  addi  $s5, $0, 3      # 3 Lives

  addi  $s4, $0, 0      # Difficulty Counter
  addi  $s7, $0, 0      # Frames Counter (resets every X and increments Difficulty)

  jal drawCharacter

  mainLoop:
    lw    $a0, red
    jal drawHearts
    jal handleInput        # jump to handleInput and save position to $ra
    jal moveObstacles
    jal moveProjectile
    jal drawProjectile
    jal drawObstacles
    jal drawCharacter
    jal adjustDifficulty

  li $v0, 32
  li $a0, 40 # Wait time
  sub    $a0, $a0, $s4    # Subtract difficulty modifier
  syscall

  j mainLoop        # jump to keyboard_input

handleInput:
  move   $s6, $s1    # $s6 = $s1
  move   $a0, $ra    # Pass in $ra, so the branches can return
  li $t9, 0xffff0000
  lw $t8, 0($t9)
  beq $t8, 1, checkPressed
  jr    $ra          # jump to $ra

  checkPressed:
    # I'm aware this is a bit of an inconventional setup (using b instead of j,
    # but it works better here)
    lw $t1, 4($t9)
    beq $t1, 0x70, restart
    ble $s5, $0, inputReturn  # Out of lives
    beq $t1, 0x20, fire
    beq $t1, 0x77, moveUp
    beq $t1, 0x61, moveLeft
    beq $t1, 0x73, moveDown
    beq $t1, 0x64, moveRight
  inputReturn:
  jr    $ra          # jump to $ra

# Increase the game difficulty increment, and difficulty level
adjustDifficulty:
  addi  $s7, $s7, 1      # Increase program increment
  addi  $t0, $0, 200      # $t0 = $0 + 200 Increment

  div    $s7, $t0      # $s7 / $t0
  mflo  $t2          #  = floor($s7 / $t0)
  beq    $t2, $0, adjustDifficultyReturn  # if $t2 == $0 then adjustDifficultyReturn

  # Check if at max Difficulty
  addi  $t2, $0, 10      # $t2 = $0 + 10
  bge    $s4, $t2, adjustDifficultyReturn  # if $s4 >= $t2 then adjustDifficultyReturn

  # Increase Difficulty
  addi  $s4, $s4, 1      # $s4 = $s4 + 1
  addi  $s3, $s3, 1      # $s3 = $s3 + 1

  move   $s7, $0    # $s7 = $0

  adjustDifficultyReturn:
  jr    $ra          # jump to $ra

# Reset all values and display items efficiently and return to main
restart:
  move   $a0, $0    # $a0 = $0
  move   $a1, $0    # $a1 = $0
  move   $a2, $0    # $a2 = $0
  move   $a3, $0    # $a3 = $0
  jal    drawingCharacter        # jump to drawingCharacter and save position to $ra
  jal    resetObstacles        # jump to resetObstacles and save position to $ra

  move   $a0, $0    # $a0 = $0
  jal    drawSkull        # jump to drawSkull and save position to $ra
  jal    drawHearts        # jump to drawHearts and save position to $ra

  addi  $t0, $0, -1      # $t0 = $t0 + -1

  lw    $t2, projectileLocation    #
  ble    $t2, $t0, main  # if $t2 <= -1 (in ready state) then main

  # Draw out the projectile
  sw $0, 12($t2)
  sw $0, 16($t2)
  sw $0, 20($t2)
  sw $0, 24($t2)

  addi  $s1, $s0, 4128      # $s1 = $s0 + 4128
  addi  $s6, $s0, 4120      # $s1 = $s0 + 4128

  b    main      # branch to main

# Draw the number of lives the character has left
# $a0: The color of the hearts
drawHearts:
  move   $t4, $a0    # $t4 = a0
  move   $t1, $ra    # return
  move   $t0, $s5    # $t0 = $s5

  # Get the hits from this frame to black out hearts
  la $t2, hits # address for obstacles (+44)
  lw    $t3, 0($t2)    #
  add    $t0, $t0, $t3    # $t0 = $t0 + $t3
  sw    $0, 0($t2)    #

  addi  $a1, $s0, 7668      # First Heart origin
  heartsLoop:
    ble    $t0, $0, drawHeartsReturn  # if $t0 <= $0 then END
    move   $a0, $t4    # $a0 = $t4
    bgt    $t0, $t3, drawHeartAndLoop  # If $t0 is less than current health, draw
    move   $a0, $0    # else; set heart color to black

    drawHeartAndLoop:
      jal    drawHeart        # jump to drawHeart and save position to $ra

      addi  $a1, $a1, -12      # $a1 = $a1 + -20
      addi  $t0, $t0, -1      # $t0 = $t0 + -1
      b    heartsLoop      # branch to heartsLoop

  drawHeartsReturn:
  jr    $t1          # jump to $t1

# $a0: Color
# $a1: Origin
drawHeart:
  # Top
  sw $a0, 0($a1)
  sw $a0, 4($a1)
  sw $a0, 256($a1)
  sw $a0, 260($a1)
  jr    $ra          # jump to $ra

# Draw the character
drawCharacter:
  ble    $s5, $0, skullAndReturn  # if $s5 <= $0 then skullAndReturn
  beq    $s1, $s6, drawCharacterReturn  # if $s1 == $s6 then drawCharacterReturn

  li    $a0, 0x6c6a71    # Ship Border
  li    $a1, 0x19a180    # ship color
  li    $a2, 0xb02525    # Flame1
  li    $a3, 0xda7b2d    # Flame2
  drawingCharacter:
  addi  $t0, $0, -1      # $t0 = $0 + -1
  beq    $s1, $t0, drawCharacterReturn  # if $s1 == $t0 then drawCharacterReturn
  sw $0, 0($s6)

  sw $0, 16($s6)
  sw $0, 20($s6)
  sw $0, 264($s6)
  sw $0, 268($s6)
  sw $0, 516($s6) #mid
  sw $0, 520($s6)
  sw $0, 776($s6) #bottom
  sw $0, 780($s6)
  sw $0, 1040($s6)
  sw $0, 1044($s6)

  # Body
  sw $0, 24($s6) #Row1
  sw $0, 28($s6)
  sw $0, 32($s6)
  sw $0, 36($s6)
  sw $0, 296($s6)
  sw $0, 300($s6)
  sw $0, 552($s6)
  sw $0, 556($s6)
  sw $0, 808($s6)
  sw $0, 812($s6)
  sw $0, 1048($s6) #Row5
  sw $0, 1052($s6)
  sw $0, 1056($s6)
  sw $0, 1060($s6)

  # Flame
  sw $a2, 16($s1)
  sw $a0, 20($s1)
  sw $a2, 264($s1)
  sw $a2, 268($s1)
  sw $a3, 272($s1)
  sw $a0, 276($s1)
  sw $a2, 516($s1) #mid
  sw $a3, 520($s1)
  sw $a3, 524($s1)
  sw $a3, 528($s1)
  sw $a0, 532($s1)
  sw $a2, 776($s1) #bottom
  sw $a2, 780($s1)
  sw $a3, 784($s1)
  sw $a0, 788($s1)
  sw $a2, 1040($s1)
  sw $a0, 1044($s1)

  # Body
  sw $a0, 24($s1) #Row1
  sw $a0, 28($s1)
  sw $a0, 32($s1)
  sw $a0, 36($s1)
  sw $a0, 280($s1) #Row2
  sw $a1, 284($s1)
  sw $a1, 288($s1)
  sw $a1, 292($s1)
  sw $a1, 296($s1)
  sw $a1, 300($s1)
  sw $a0, 536($s1) #Row3
  sw $a1, 540($s1)
  sw $a1, 544($s1)
  sw $a1, 548($s1)
  sw $a1, 552($s1)
  sw $a1, 556($s1)
  sw $a0, 792($s1) #row4
  sw $a1, 796($s1)
  sw $a1, 800($s1)
  sw $a1, 804($s1)
  sw $a1, 808($s1)
  sw $a1, 812($s1)
  sw $a0, 1048($s1) #Row5
  sw $a0, 1052($s1)
  sw $a0, 1056($s1)
  sw $a0, 1060($s1)

  drawCharacterReturn:
    jr    $ra          # jump to $ra

  skullAndReturn:
    move   $a0, $0    # $a0 = $0
    move   $a1, $0    # $a1 = $0
    move   $a2, $0    # $a2 = $0
    move   $a3, $0    # $a3 = $0
    move   $t2, $ra    # $t0 = $ra
    # Erase the character
    jal    drawingCharacter        # jump to drawingCharacter and save position to $ra

    lw    $a0, white    #
    jal    drawSkull        # jump to drawSkull and save position to $ra

    addi  $t1, $0, -1      # $t1 = $0 + -1
    move   $s1, $t1    # $s1 = $t1
    jr    $t2          # jump to $ra

# Calculate horizontal distance between address $a3 and $a2
# Return distance $v0
distanceOnX:
  sub    $t2, $a3, $a2    # $t2 = $a3 - $s0
  addi  $v0, $0, 256      # $v0 = column width

  # Getting the y position
  div    $t2, $v0       # $t2 / $v0
  mflo    $v1            #  This is the y position

  mult  $v1, $v0      # $t2 * $v0 = Hi and Lo registers
  mflo  $v1          # copy Lo to

  # $v0 is now the projectile distance from right side
  sub    $v1, $t2, $v1    # $v0 = $v1 - $t2
  sub    $v0, $v0, $v1    # $v0 = $v0 - $v1
  jr    $ra          # jump to $ra

# Calculate vertical distance between address $a3 and $a2
# Return distance $v0
distanceOnY:
  sub    $t2, $a2, $s0    # $t2 = $a2 - $s0
  sub    $t3, $a3, $s0    # $t3 = $a3 - $s0
  addi  $v0, $0, 256      # $v0 = column width

  # Y position of a2
  div    $t2, $v0      # $t2 / 256
  mflo  $t2          #  = $t2 mod 256

  # Y position of a2
  div    $t3, $v0      # $t2 / 256
  mflo  $t3          #  = $t2 mod 256

  # Set v0 as distance Y $a2 - $a3
  sub    $v0, $t3, $t2    # $v0 = $t3 - $t2
  jr    $ra          # jump to $ra

# Reset all the obstacles in the obstacle array
resetObstacles:
  add  $t0, $0, $s3      # Iterate over all obstacles
  la $t4, obstacles # address for obstacles (+44)

  resetObsLoop:
    beq    $t0, $0, resetObstaclesReturn  # if $t0 == $0 then resetObstaclesReturn
    lw    $t1, 0($t4)    # Get the obstacle position
    blt    $t1, $s0, updateResetObsCounter  # if $t1 < $s0 then updateResetObsCounter

    sw $0, 0($t1)
    sw $0, 4($t1)
    sw $0, 256($t1)
    sw $0, 260($t1)

    # Generate Obstacle
    li $v0, 42 # Service 42, random int range
    li $a0, 1 # Select random generator 0
    li $a1, 150 # Select upper bound of random number
    syscall

    subu    $t1, $0, $a0    # $t1 = $0 - $a0
    sw    $t1, 0($t4)    #
    sw    $0, 4($t4)    #

    updateResetObsCounter:
    addi  $t4, $t4, 8      # Increment projectiles
    addi  $t0, $t0, -1      # Loop counter

    j    resetObsLoop        # jump to LOOP

  resetObstaclesReturn:
  jr    $ra          # jump to $ra

# a0: Address of the projectile that hit the player
hitPlayer:
  lw    $t2, 4($a0)    # Get the obstacle type

  addi  $t8, $0, 1      # $t8 = $0 + 1
  beq    $t2, $t8, playerGotHealth  # if $t7 == $t8 then setColorHealth

  addi  $t8, $0, 2      # $t8 = $0 + 2
  beq    $t2, $t8, playerDecreasedDifficulty  # if $t7 == $t8 then setColorGreen
  # Else player hit an Asteroid, Add another hit to this frame
  addi  $s5, $s5, -1      # Lose 1 health
  la $t2, hits # address for obstacles (+44)
  lw    $v0, 0($t2)    #
  addi  $v0, $v0, 1      # $v0 = $v0 + 1
  sw    $v0, 0($t2)    #
  jr    $ra

  playerGotHealth:
    addi  $t8, $0, 15      # $t8 = Max Health
    bge    $s5, $t8, hitPlayerReturn  # if $s5 >= $t8 then hitPlayerReturn
    addi  $s5, $s5, 1      # Gain 1 health

    jr    $ra
  playerDecreasedDifficulty:
    addi  $t8, $0, 1      # $t8 = Min difficulty
    move   $s7, $0    # Reset the difficulty increase timer
    ble    $s4, $t8, hitPlayerReturn  # if $s4 <= $t8 then hitPlayerReturn

    addi  $s4, $s4, -1      # Make it 1 point easier

  hitPlayerReturn:
  jr    $ra          # jump to $ra

# Move the obstacles across the screen and check player/bounds/projectile collisions
moveObstacles:
  move   $t7, $ra    # $t6 = $ra
  add  $t0, $0, $s3      # Loop counter over obstacles
  la $t4, obstacles # address for obstacles

  obstaclesLoop:
    # t1: Obstacle position
    # t4: Obstacle array item address
    beq    $t0, $0, moveObstaclesReturn  # if $t0 == $0 then moveObstaclesReturn
    lw    $t1, 0($t4)    # Get the obstacle position

    addi  $t6, $0, -1      # $t6 = $0 + -1
    blt    $t1, $t6, decreaseCooldown  # if $t1 < $t6 then decreaseCooldown
    bne    $t1, $t6, moveObstacle  # if $t1 != $t6 then moveObstacle

    # Generate Obstacle randomly
    sw    $0, 4($t4)    # Set obstacle type to projectile

    li $v0, 42 # Service 42, random int range
    li $a0, 23 # Select random generator 0
    li $a1, 30 # Select upper bound of random number
    syscall

    addi  $t3, $0, 256      # $t3 = $0 + 256

    mult  $t3, $a0      # $t3 * $a0 = Hi and Lo registers
    mflo  $t3          # copy Lo to $t3
    add  $t1, $t3, $s0      # $t1 = $t3 + $s0
    addi  $t1, $t1, -4      # $t1 = $t1 + -1

    moveObstacle:
      # Check if obstacle is a pick-up
      lw    $t6, 4($t4)    #
      bgt    $t6, $0, checkPlayerCollisions  # if $t6 > $0 then

      # Check if obstacle is colliding with projectile
      addi  $t6, $0, -1      # $t6 = $0 + -1
      lw    $t9, projectileLocation
      ble    $t9, $t6, checkPlayerCollisions  # Dont check projectile collision if proj in ready state
        move   $a3, $t9    # $a3 = projectile Origin
        move   $a2, $t1    # $a2 = Obstacle origin
        addi  $a3, $a3, 12      # $a3 = $a3 + 12

        jal    distanceOnX        # jump to distanceOnX and save position to $ra
        move   $t3, $v0    # $t3 = $v0

        addi  $t6, $0, 268      # $t6 = $0 + 12
        blt    $t3, $t6, secondProjCollisionCheck  # if not colliding on x, then check player collisions

        # else check Vertical Collision with Projectile
        addi  $t6, $0, 280      # $t6 = $0 + 12
        bgt    $t3, $t6, secondProjCollisionCheck  # if not colliding on y, then move obs
        b    projYCollisionCheck      # branch to projYCollisionCheck

        secondProjCollisionCheck:
        addi  $t6, $0, 8      # $t6 = $0 + 12
        blt    $t3, $t6, checkPlayerCollisions  # if not colliding on x, then check player collisions

        # else check Vertical Collision with Projectile
        addi  $t6, $0, 24      # $t6 = $0 + 12
        bgt    $t3, $t6, checkPlayerCollisions  # if not colliding on y, then move obs

        projYCollisionCheck:
        jal    distanceOnY        # jump to distanceOnY and save position to $ra
        move   $t2, $v0    # $t2 = $vo

        addi  $t6, $0, 0     # $t6 = $0 + 3
        blt    $t2, $t6, checkPlayerCollisions  # if $t2 < $0 then checkIfObsAtScreen
        addi  $t6, $0, 1     # $t6 = $0 + 3
        # Not colliding on Y, check player collisions
        bgt    $t2, $t6, checkPlayerCollisions  # if $t2 > $t6 then checkPlayerCollisions

        # Delete projectile
        sw $0, 12($t9)
        sw $0, 16($t9)
        sw $0, 20($t9)
        sw $0, 24($t9)
        addi  $t9, $0, -97      # $t9 = $0 + -97
        sw    $t9, projectileLocation    #

        # Generate a pickup type
        li $v0, 42 # Service 42, random int range
        li $a0, 2 # Random Seed
        li $a1, 3 # 0: Asteroid, 1: health, 2: decrease diff
        syscall
        move   $t6, $a0    # $t6 = $a0

        sw    $t6, 4($t4)
        beq    $t6, $0, deleteObstacle  # if new type is Asteroid then deleteObstacle
        b    updateObstaclesCounter      # branch to updateObstaclesCounter

      checkPlayerCollisions:
      # t2, vertical distance from player
      # t3, horizontal distance from player
      move   $a3, $t1    # $a3 = $t1
      move   $a2, $s1    # $a2 = $s1
      jal    distanceOnX        # jump to distanceOnX and save position to $ra
      move   $t3, $v0    # $t3 = $v0

      addi  $t6, $0, 208      # $t6 = $0 + 12
      blt    $t3, $t6, checkIfObsAtScreen  # if $t3 < $t6 then checkIfObsAtScreen

      # check Vertical Collision with player
      addi  $t6, $0, 256      # $t6 = $0 + 12
      bgt    $t3, $t6, checkIfObsAtScreen  # if $t3 > $t6 then checkIfObsAtScreen

      jal    distanceOnY        # jump to distanceOnY and save position to $ra
      move   $t2, $v0    # $t2 = $vo

      addi  $t6, $0, -1     # $t6 = $0 + 3
      blt    $t2, $t6, checkIfObsAtScreen  # if $t2 < $0 then checkIfObsAtScreen
      addi  $t6, $0, 4     # $t6 = $0 + 3
      ble    $t2, $t6, obstacleCollision  # if $t2 <= $t6 then obstacleCollision

      checkIfObsAtScreen:
      # Check if obstacle is at screen left boundary
      move   $a3, $t1    # $a3 = $t1
      move   $a2, $s0    # $a2 = $s0
      jal    distanceOnX        # jump to distanceOnX and save position to $ra
      move   $t5, $v0    # $t5 = $v0 player distance from left screen
      addi  $t3, $0, 256      # $t3 = $0 + 256

      beq    $t1, $s0, deleteObstacle  # if obstacle is at address 0 then deleteObstacle

      blt    $t5, $t3, moveObstacleLeft  # if $t5 < $t3 then obstaclesLoop

      deleteObstacle:
      # Delete Obstacle
      sw $0, 0($t1)
      sw $0, 4($t1)
      sw $0, 256($t1)
      sw $0, 260($t1)
      addi  $t1, $0, -15      # $t1 = $0 + -15

      # If there are no collisions, move the obstacle across the screen
      moveObstacleLeft:
      addi  $t1, $t1, -4      # $t1 = $t1 + -4

      addi  $t6, $0, 10      # $t6 = Speed increase/diffulty tick
      div    $s4, $t6      # $s4 / $t6 diffulty/5
      mflo  $t6          #  = floor($s4 / $t6) = speed modifier

      addi  $t8, $0, -4      # $t4 = $0 + -4

      mult  $t6, $t8      # $t6 * $t4 Multiple speed mod by dist
      mflo  $t6

      add    $t1, $t1, $t6    # $t1 = $t1 + $t6

      sw    $t1, 0($t4)
      b    updateObstaclesCounter      # branch to updateObstaclesCounter

      # If the obstacle is colliding with the player
      obstacleCollision:
      move   $a0, $t4    # $a0 = $t1
      jal    hitPlayer        # jump to hitPlayer and save position to $ra
      sw $0, 0($t1)
      sw $0, 4($t1)
      sw $0, 256($t1)
      sw $0, 260($t1)
      addi  $t1, $0, -15      # $t1 = $0 + -15
      addi  $t1, $t1, -4      # $t1 = $t1 + -4
      sw    $t1, 0($t4)

      updateObstaclesCounter:
      addi  $t4, $t4, 8      # Increment projectiles
      addi  $t0, $t0, -1      # Loop counter

      j    obstaclesLoop        # jump to LOOP

      # If the obstacle is not on screen, but in cooldown to be respawned
      decreaseCooldown:
      addi  $t1, $t1, 1      # $t1 = $t1 + 12
      sw    $t1, 0($t4)    #
      b    updateObstaclesCounter      # branch to updateObstaclesCounter

  moveObstaclesReturn:
  jr    $t7

# Drawing all the obstacles
drawObstacles:
  add  $t0, $0, $s3      # Loop counter over obstacles
  la $t4, obstacles # address for obstacles (+44)

  drawObstaclesLoop:
    beq    $t0, $0, drawObstaclesReturn  # if $t0 == $0 then drawObstaclesReturn
    lw    $t1, 0($t4)    # Get the obstacle position
    lw    $t7, 4($t4)    # Get the obstacle type (Asteroid, Health, Difficulty)

    sub  $t2, $t1, $s0      # $t2 = $t1 + $s0
    addi  $t6, $0, 0      # $t6 = $0 + 12

    blt    $t2, $t6, updateDrawObsCounter  # if obstacle is offscreen then updateDrawObsCounter

    # Figure out what color the obstacle is based on its type
    lw    $t6, brown    # Set Color to Asteroid brown
    addi  $t8, $0, 1      # $t8 = $0 + 1
    beq    $t7, $t8, setColorHealth  # if $t7 == $t8 then setColorHealth

    addi  $t8, $0, 2      # $t8 = $0 + 2
    beq    $t7, $t8, setColorGreen  # if $t7 == $t8 then setColorGreen

    b    drawObstacle      # branch to drawObstacle

    setColorHealth:
      lw    $t6, health
      b    drawObstacle      # branch to drawObstacle
    setColorGreen:
      lw    $t6, green

    drawObstacle:
    sw $t6, 0($t1)
    sw $t6, 4($t1)
    sw $0, 8($t1)
    sw $0, 12($t1)
    sw $t6, 256($t1)
    sw $t6, 260($t1)
    sw $0, 264($t1)
    sw $0, 268($t1)

    updateDrawObsCounter:
    addi  $t4, $t4, 8      # Increment projectiles
    addi  $t0, $t0, -1      # Loop counter

    j    drawObstaclesLoop        # jump to LOOP

  drawObstaclesReturn:
  jr    $ra

# Draw the projectile on screen
drawProjectile:
  move   $t5, $ra    # $t4 = $ra
  addi  $t6, $0, -1      # $t6 = $0 + -1
  lw    $t9, projectileLocation
  # Check if projectile is on screen
  ble    $t9, $t6, drawProjectileReturn  # if $t9 <= $t6 then drawProjectileReturn
  # Get the projectile distance from left screen bound
  move   $a2, $s0    # $a2 = $s0
  move   $a3, $t9    # $a3 = $t9
  jal    distanceOnX        # jump to distanceOnX and save position to $ra

  # Draw out the old position
  sw $0, 0($t9)
  sw $0, 4($t9)
  sw $0, 8($t9)
  sw $0, 12($t9)
  # Redraw ship arm just in case
  li    $t0, 0x6c6a71    # Ship Border
  sw $t0, 24($s1) #Row1
  sw $t0, 28($s1)
  sw $t0, 32($s1)
  sw $t0, 36($s1)
  # If projectile is colliding with the right side of the scrren
  addi  $t0, $0, 14      # $t0 = $0 + 14
  ble    $v0, $t0, destroyReturn  # if $v0 <= $t0 then destroyReturn

  # Not worth setting up a loop for 3 checks since it would require more data
  # writes, jumps and checks (only advantage is cleaner code)
  li    $t2, 0xffd212    # Projectile Color
  sw $t2, 12($t9)
  addi  $t0, $0, 16      # $t0 = $0 + 14
  ble    $v0, $t0, drawProjectileReturn  # if $v0 <= $t0 then drawProjectileReturn
  sw $t2, 16($t9)
  addi  $t0, $0, 20      # $t0 = $0 + 14
  ble    $v0, $t0, drawProjectileReturn  # if $v0 <= $t0 then drawProjectileReturn
  sw $t2, 20($t9)
  addi  $t0, $0, 24      # $t0 = $0 + 14
  ble    $v0, $t0, drawProjectileReturn  # if $v0 <= $t0 then drawProjectileReturn
  sw $t2, 24($t9)

  drawProjectileReturn:
    jr    $t5         # jump to $ra

  destroyReturn:
    addi  $t9, $0, -97      # $t9 = $0 + -32
    sw    $t9, projectileLocation
    jr    $t5          # jump to $ra

# Moves the projectile across the screen
moveProjectile:
  lw    $t9, projectileLocation
  addi  $t6, $0, -1      # $t6 = $0 + -1
  # Check if the projtile is on screen
  beq    $t9, $t6, moveProjectileReturn  # if $t9 == $t6 then moveProjectileReturn
  addi  $t9, $t9, 12      # $t9 = $t9 + 8
  sw    $t9, projectileLocation

  moveProjectileReturn:
  jr    $ra          # jump to $ra

# Draw skull
drawSkull:
  # Top
  sw $a0, 3192($s0)
  sw $a0, 3196($s0)
  sw $a0, 3200($s0)
  sw $a0, 3204($s0)
  sw $a0, 3208($s0)

  # Head
  sw $a0, 3956($s0)
  sw $a0, 3700($s0)
  sw $a0, 3444($s0)
  sw $a0, 3448($s0)
  sw $a0, 3452($s0)
  sw $a0, 3456($s0)
  sw $a0, 3460($s0)
  sw $a0, 3464($s0)
  sw $a0, 3468($s0)
  sw $a0, 3724($s0)
  sw $a0, 3980($s0)
  # Eye Level
  sw $a0, 4212($s0)
  sw $a0, 3956($s0)
  sw $a0, 3700($s0)
  sw $a0, 3704($s0)
  sw $a0, 3708($s0)
  sw $a0, 3712($s0)
  sw $a0, 3716($s0)
  sw $a0, 3720($s0)
  sw $a0, 3724($s0)
  sw $a0, 3980($s0)
  sw $a0, 4236($s0)
  sw $a0, 3968($s0) # Bridge
  sw $a0, 4224($s0)
  # Mouth
  sw $a0, 4472($s0)
  sw $a0, 4476($s0)
  sw $a0, 4728($s0)
  sw $a0, 4480($s0) # Center
  sw $a0, 4484($s0)
  sw $a0, 4488($s0)
  sw $a0, 4744($s0)
  sw $a0, 4736($s0)
  jr    $ra

# File projectile
fire:
  addi  $t6, $0, -1      # $t6 = $0 + -1
  lw    $t9, projectileLocation
  # Check if the projectile is ready
  bne    $t9, $t6, fireReturn  # if $t9 == $t6/Ready Index then fireReturn
  move   $t9, $s1    # $t9 = $s1
  addi  $t9, $t9, 12      # $t9 = $t9 + 8
  sw    $t9, projectileLocation

  fireReturn:
  jr    $a0

# ********
# Movement Methods
# *******

moveLeft:
  sub    $t2, $s1, $s0    # $t2 = $s1 - $s0
  addi  $t3, $0, 256      # $t3 = $0 + 64

  div    $t2, $t3      # $t2 / $t3
  mfhi  $t3          #  = $t2 mod $t3

  beq    $t3, $0, returnMoveLeft  # if $t3 == $0 then returnMoveLeft

  addi  $s1, $s1, -8      # $s1 = $s1 + -8
  returnMoveLeft:
  jr    $a0          # jump to $a0

moveRight:
  move   $a2, $s0    # $a2 = $s0
  move   $a3, $s1    # $a3 = $s1

  jal    distanceOnX        # jump to distanceOnX and save position to $ra

  addi  $t1, $0, 48      # $t1 = $0 + 48

  ble    $v0, $t1, returnMoveRight  # if $v0 <= $t1 then returnMoveRight

  addi  $s1, $s1, 8      # $s1 = $s1 + 8
  returnMoveRight:
  jr    $a0          # jump to $a0

moveDown:
  addi  $t2, $s0, 7176      # $t2 = $s0 + 256 * 28 (window height 32 units - ship height units)
  bge    $s1, $t2, returnMoveDown  # if $s1 >= $t2 then returnMoveDown

  addi  $s1, $s1, 256      # $s1 = $s1 + 512
  returnMoveDown:
  jr    $a0          # jump to $a0

moveUp:
  addi  $t1, $s0, 255      # $t1 = $t1 + 256
  ble    $s1, $t1, returnMoveUp  # if $s1 <= $t2 then returnMoveUp

  addi  $s1, $s1, -256      # $s1 = $s1 + -512
  returnMoveUp:
  jr    $a0          # jump to $a0

END:
  li $v0, 10
  syscall
