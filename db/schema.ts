import { type SQLiteDatabase } from 'expo-sqlite';

// [name, muscle_group, equipment_type, is_bodyweight, instructions, base_name]
const SEED_EXERCISES: [string, string, string, number, string, string][] = [
  // CHEST — Bench Press
  ['Bench Press (Barbell)', 'Chest', 'Barbell', 0, 'Lie flat on a bench with feet on the floor. Grip the bar slightly wider than shoulder-width. Unrack, lower to your mid-chest with elbows at roughly 45°, then press to full extension. Keep shoulder blades retracted throughout.', 'Bench Press'],
  ['Bench Press (Dumbbell)', 'Chest', 'Dumbbell', 0, 'Lie flat on a bench holding dumbbells above your chest. Lower them to your sides with elbows at roughly 45° until your upper arms are parallel to the floor. Press back to full extension.', 'Bench Press'],
  ['Bench Press (Cable)', 'Chest', 'Cable', 0, 'Set cables to low or mid position and sit or stand facing away. Press handles forward and slightly together, squeezing your chest at the peak. Cable provides constant tension throughout the range of motion.', 'Bench Press'],
  ['Bench Press (Machine)', 'Chest', 'Machine', 0, 'Adjust the seat so handles align with mid-chest. Press forward to full extension squeezing your chest. Control the return. The machine removes stabilization demands and lets you focus purely on chest contraction.', 'Bench Press'],
  // CHEST — Incline Bench Press
  ['Incline Bench Press (Barbell)', 'Chest', 'Barbell', 0, 'Set bench to 30–45°. Lie back and grip the bar slightly wider than shoulder-width. Lower to your upper chest with elbows slightly less flared than flat bench. Press to full extension. The incline shifts emphasis to the upper chest.', 'Incline Bench Press'],
  ['Incline Bench Press (Dumbbell)', 'Chest', 'Dumbbell', 0, 'Set bench to 30–45°. Hold dumbbells above your upper chest and lower them with controlled elbow flare. Press to full extension. The incline emphasizes the upper pec and front deltoids.', 'Incline Bench Press'],
  ['Incline Bench Press (Cable)', 'Chest', 'Cable', 0, 'Set cables low and sit on an incline bench between them. Press cables up and together at the same angle as the incline. Constant cable tension targets the upper chest throughout.', 'Incline Bench Press'],
  ['Incline Bench Press (Machine)', 'Chest', 'Machine', 0, 'Sit at an incline press machine with handles at upper-chest height. Press to full extension squeezing your upper pec. Control the return. The fixed path reduces stabilization demands.', 'Incline Bench Press'],
  // CHEST — Decline Bench Press
  ['Decline Bench Press (Barbell)', 'Chest', 'Barbell', 0, 'Set bench to a 15–30° decline. Grip the bar slightly wider than shoulder-width and lower to your lower chest with elbows at about 45°. Press to full extension. The decline shifts emphasis to the lower pec.', 'Decline Bench Press'],
  ['Decline Bench Press (Dumbbell)', 'Chest', 'Dumbbell', 0, 'Lie on a decline bench holding dumbbells above your lower chest. Lower them with controlled elbow flare until you feel a deep stretch. Press back to full extension.', 'Decline Bench Press'],
  // CHEST — Chest Fly
  ['Chest Fly (Dumbbell)', 'Chest', 'Dumbbell', 0, 'Lie on a flat bench holding dumbbells above your chest with a slight elbow bend. Lower the weights in a wide arc until you feel a deep chest stretch. Reverse the arc back to the top, squeezing your pecs. Avoid fully locking out elbows.', 'Chest Fly'],
  ['Chest Fly (Cable)', 'Chest', 'Cable', 0, 'Set cables high (or adjust for target region). Stand center and bring handles forward and down in a wide arc, squeezing hard as your hands meet. Cable flies provide continuous tension — focus on the peak contraction.', 'Chest Fly'],
  ['Chest Fly (Machine)', 'Chest', 'Machine', 0, 'Sit with your back flat against the pad and grip the handles. Bring your arms together in front of you, squeezing your chest at full adduction. Control the eccentric return.', 'Chest Fly'],
  // CHEST — Push-Up, Dip
  ['Push-Up', 'Chest', 'Bodyweight', 1, 'Place hands slightly wider than shoulder-width. Lower your chest to the floor with your body in a straight line from head to heels, elbows at roughly 45°. Press back to full arm extension, squeezing your chest at the top.', 'Push-Up'],
  ['Dip', 'Chest', 'Bodyweight', 1, 'Support yourself on parallel bars with arms fully extended. Lean your torso slightly forward to target the chest. Lower until your upper arms are roughly parallel to the floor, then press back to full extension. Keep your shoulders down throughout.', 'Dip'],

  // BACK — Deadlift
  ['Deadlift (Barbell)', 'Back', 'Barbell', 0, 'Stand with the bar over your mid-foot, feet hip-width apart. Hinge at the hips and grip just outside your legs. Brace hard, pull the slack out, then push the floor away as you stand. Keep the bar dragging along your shins and thighs. Lock out by squeezing your glutes at the top.', 'Deadlift'],
  // BACK — Row
  ['Row (Barbell)', 'Back', 'Barbell', 0, 'Hinge forward until your torso is roughly 45° to horizontal, knees slightly bent. Pull the bar into your lower chest or upper abdomen, driving your elbows back. Hold briefly at the top, then lower with control. Keep your lower back flat throughout.', 'Row'],
  ['Row (Dumbbell)', 'Back', 'Dumbbell', 0, 'Place one knee and hand on a bench for support. Hold a dumbbell with the other hand and pull it toward your hip, driving your elbow straight back. Lower under control. Keep your torso parallel to the floor throughout.', 'Row'],
  ['Row (Cable)', 'Back', 'Cable', 0, 'Sit at a cable row station with feet on the platform, knees slightly bent. Pull the handle into your lower abdomen, driving your elbows back and squeezing your shoulder blades together. Return with control to full arm extension.', 'Row'],
  ['Row (Machine)', 'Back', 'Machine', 0, 'Sit at a machine row with your chest against the pad. Pull the handles back toward your torso, retracting your shoulder blades at the peak. Return to full extension. The machine provides a guided path for consistent technique.', 'Row'],
  // BACK — Lat Pulldown
  ['Lat Pulldown (Cable)', 'Back', 'Cable', 0, 'Sit at a cable pulldown with a wide overhand grip. Lean back slightly and pull the bar to your upper chest, driving your elbows down and back. Squeeze your lats at the bottom. Return with control until your arms are fully extended.', 'Lat Pulldown'],
  ['Lat Pulldown (Machine)', 'Back', 'Machine', 0, 'Grip the handles on a lat pulldown machine. Pull down toward your upper chest, focusing on driving your elbows down rather than pulling with your hands. Return to full extension under control.', 'Lat Pulldown'],
  // BACK — Pull-Up, Chin-Up
  ['Pull-Up', 'Back', 'Bodyweight', 1, 'Hang from a bar with hands shoulder-width apart, palms facing away. Pull yourself up by driving your elbows down and back until your chin clears the bar. Lower to a dead hang between reps. Engage your scapulae at the start of every rep.', 'Pull-Up'],
  ['Chin-Up', 'Back', 'Bodyweight', 1, 'Hang from a bar with hands shoulder-width apart, palms facing you. Pull yourself up until your chin clears the bar, focusing on squeezing your biceps and pulling your elbows down. Lower to a dead hang. The underhand grip involves the biceps more than a pull-up.', 'Chin-Up'],
  // BACK — Straight Arm Pulldown
  ['Straight Arm Pulldown (Cable)', 'Back', 'Cable', 0, 'Stand facing a high cable with a rope or bar. With arms straight and a slight elbow bend, pull the cable down until your hands reach your thighs, hinging only at the shoulder. Keep your core braced. Focus on squeezing your lats — avoid bending your elbows.', 'Straight Arm Pulldown'],
  // BACK — Shrug
  ['Shrug (Barbell)', 'Back', 'Barbell', 0, 'Hold a barbell at hip level with an overhand grip. Shrug your shoulders straight up toward your ears as high as possible. Hold briefly at the top, then lower under control. Avoid rolling your shoulders — purely vertical movement targets the upper traps.', 'Shrug'],
  ['Shrug (Dumbbell)', 'Back', 'Dumbbell', 0, 'Hold a dumbbell in each hand at your sides. Shrug your shoulders straight up as high as possible, squeezing your traps at the top. Lower under control. Dumbbells allow a slightly greater range of motion than a barbell.', 'Shrug'],

  // SHOULDERS — Overhead Press
  ['Overhead Press (Barbell)', 'Shoulders', 'Barbell', 0, 'Grip the bar just outside shoulder-width with it resting on your front delts. Brace your core, squeeze your glutes, and press straight overhead, moving your head slightly back then forward as the bar clears your chin. Fully lock out at the top. Lower under control to the starting position.', 'Overhead Press'],
  ['Overhead Press (Dumbbell)', 'Shoulders', 'Dumbbell', 0, 'Sit or stand holding dumbbells at shoulder height, palms facing forward. Press both dumbbells overhead until arms are fully extended. Lower back to shoulder height under control. Dumbbells allow independent movement and a longer range of motion than a barbell.', 'Overhead Press'],
  ['Overhead Press (Machine)', 'Shoulders', 'Machine', 0, 'Sit with your back against the pad and grip the handles at shoulder height. Press overhead to full extension and lower under control. The machine path removes stabilization demand, letting you focus on shoulder strength.', 'Overhead Press'],
  // SHOULDERS — Lateral Raise
  ['Lateral Raise (Dumbbell)', 'Shoulders', 'Dumbbell', 0, 'Stand holding dumbbells at your sides, palms facing inward. With a slight bend in your elbows, raise the weights out to your sides until your arms are parallel to the floor. Lead with your pinkies slightly to keep tension on the medial deltoid. Lower slowly.', 'Lateral Raise'],
  ['Lateral Raise (Cable)', 'Shoulders', 'Cable', 0, 'Stand sideways to a low cable pulley, gripping the handle with the hand farthest from the machine. With a slight elbow bend, raise your arm out to your side until parallel to the floor. The cable provides constant tension throughout. Lower with control.', 'Lateral Raise'],
  ['Lateral Raise (Machine)', 'Shoulders', 'Machine', 0, 'Sit at a lateral raise machine with pads against your forearms or handles in hand. Raise your arms out to your sides until parallel to the floor. Control the return. The machine provides a different resistance curve than free weights.', 'Lateral Raise'],
  // SHOULDERS — Front Raise
  ['Front Raise (Dumbbell)', 'Shoulders', 'Dumbbell', 0, 'Stand holding dumbbells at your thighs, palms facing back. Raise both weights forward to shoulder height with a slight elbow bend. Lower slowly. Targets the anterior deltoid. Avoid swinging the weights up.', 'Front Raise'],
  ['Front Raise (Barbell)', 'Shoulders', 'Barbell', 0, 'Stand holding a barbell in front of your thighs with an overhand grip. Raise the bar to shoulder height with arms nearly straight. Lower under control. Barbell loading means both arms move together.', 'Front Raise'],
  ['Front Raise (Cable)', 'Shoulders', 'Cable', 0, 'Set a cable to the low position. Stand facing away and raise the handle forward to shoulder height with a slight elbow bend. Cable tension is constant throughout. Lower with control.', 'Front Raise'],
  // SHOULDERS — Rear Delt Fly
  ['Rear Delt Fly (Dumbbell)', 'Shoulders', 'Dumbbell', 0, 'Hinge forward at the hips or lie face-down on an incline bench. Holding dumbbells, raise them out to your sides in a wide arc, squeezing your rear delts and upper back at the top. Lower slowly.', 'Rear Delt Fly'],
  ['Rear Delt Fly (Cable)', 'Shoulders', 'Cable', 0, 'Set two cables to the high position and cross the handles. With arms nearly straight, pull them out to your sides in a reverse-fly motion. Squeeze your rear delts at full extension and control the return.', 'Rear Delt Fly'],
  ['Rear Delt Fly (Machine)', 'Shoulders', 'Machine', 0, 'Sit facing the pad on a pec deck machine with arms extended. Grip the handles and pull them back in a wide arc, squeezing your rear deltoids and upper back. Control the return.', 'Rear Delt Fly'],
  // SHOULDERS — Face Pull
  ['Face Pull (Cable)', 'Shoulders', 'Cable', 0, 'Set a cable pulley to face height with a rope attachment. Step back and grip each end of the rope, palms facing each other. Pull the rope toward your face by driving your elbows back and out to the sides, finishing with hands beside your ears and upper arms parallel to the floor. This targets the rear deltoids and external rotators. Control the return.', 'Face Pull'],

  // BICEPS — Bicep Curl
  ['Bicep Curl (Barbell)', 'Biceps', 'Barbell', 0, 'Stand holding a barbell with an underhand grip, hands shoulder-width apart. Keeping upper arms at your sides, curl the bar up by contracting your biceps. Lower slowly to full extension. Using a barbell allows heavier loading than dumbbells.', 'Bicep Curl'],
  ['Bicep Curl (Dumbbell)', 'Biceps', 'Dumbbell', 0, 'Stand holding a dumbbell in each hand, arms fully extended, palms facing forward. Keeping your upper arms stationary at your sides, curl the weights up by contracting your biceps. Squeeze at the top, then lower slowly to full extension. Avoid swinging your torso.', 'Bicep Curl'],
  ['Bicep Curl (Cable)', 'Biceps', 'Cable', 0, 'Stand at a low cable with a bar or EZ attachment, underhand grip. Curl the handle toward your chin, keeping your upper arms still. Cable provides constant tension at the bottom of the range of motion, unlike free weights.', 'Bicep Curl'],
  ['Bicep Curl (Machine)', 'Biceps', 'Machine', 0, 'Sit at a preacher or arm curl machine and grip the handles underhand. Curl fully, squeezing hard at the top. The machine guides the path and eliminates stabilization requirements.', 'Bicep Curl'],
  // BICEPS — Hammer Curl
  ['Hammer Curl (Dumbbell)', 'Biceps', 'Dumbbell', 0, 'Stand holding dumbbells at your sides with palms facing your body (neutral grip). Curl both dumbbells up simultaneously, keeping the neutral grip throughout. The hammer grip targets the brachialis and brachioradialis alongside the biceps.', 'Hammer Curl'],
  ['Hammer Curl (Cable)', 'Biceps', 'Cable', 0, 'Attach a rope to a low cable. Grip both ends with a neutral grip. Curl the rope toward your shoulders, keeping your upper arms stationary. The neutral grip emphasizes the brachialis more than a supinated curl.', 'Hammer Curl'],
  // BICEPS — Preacher Curl
  ['Preacher Curl (Barbell)', 'Biceps', 'Barbell', 0, 'Sit at a preacher bench with your upper arms flat on the pad. Curl a barbell up until your elbows are nearly fully flexed, then lower slowly to a full stretch. The preacher pad eliminates cheating and isolates the biceps.', 'Preacher Curl'],
  ['Preacher Curl (Dumbbell)', 'Biceps', 'Dumbbell', 0, 'Sit at a preacher bench and work one arm at a time. Curl a dumbbell from full extension to full flexion. Work each arm independently for balanced development.', 'Preacher Curl'],
  ['Preacher Curl (Machine)', 'Biceps', 'Machine', 0, 'Sit at a preacher curl machine with upper arms on the pad. Curl to full flexion and lower to full extension. The machine version provides a controlled path and consistent resistance curve.', 'Preacher Curl'],
  // BICEPS — Concentration Curl
  ['Concentration Curl (Dumbbell)', 'Biceps', 'Dumbbell', 0, 'Sit on a bench and brace the back of your upper arm against the inside of your thigh. Curl the dumbbell from full extension to full flexion, supinating your wrist at the top. This position isolates the biceps and prevents any body English.', 'Concentration Curl'],

  // TRICEPS — Tricep Pushdown
  ['Tricep Pushdown (Cable)', 'Triceps', 'Cable', 0, 'Stand facing a high cable pulley with a bar or rope attachment. Grip with your elbows tucked close to your sides. Press the attachment down until your arms are fully extended, squeezing your triceps hard at the bottom. Keep upper arms pinned throughout.', 'Tricep Pushdown'],
  // TRICEPS — Overhead Tricep Extension
  ['Overhead Tricep Extension (Dumbbell)', 'Triceps', 'Dumbbell', 0, 'Hold a single dumbbell overhead with both hands under the inner plate. Lower it behind your head by bending only at the elbows, keeping upper arms vertical. Extend back to full lockout. This stretches the long head of the tricep.', 'Overhead Tricep Extension'],
  ['Overhead Tricep Extension (Barbell)', 'Triceps', 'Barbell', 0, 'Hold a barbell overhead with an overhand grip, arms extended. Lower it behind your head by bending at the elbows, keeping upper arms vertical. Extend to full lockout.', 'Overhead Tricep Extension'],
  ['Overhead Tricep Extension (Cable)', 'Triceps', 'Cable', 0, 'Set a rope on a high cable and face away from it. Grip the rope behind your head. Press it forward and down until your arms are fully extended. Facing away from the cable changes the resistance curve compared to a standard pushdown.', 'Overhead Tricep Extension'],
  // TRICEPS — Skull Crusher
  ['Skull Crusher (Barbell)', 'Triceps', 'Barbell', 0, 'Lie on a flat bench holding an EZ-bar above your forehead with arms extended. Bend only at the elbows, lowering the bar toward your forehead. Extend back to full lockout. Keep your upper arms perpendicular to the floor throughout.', 'Skull Crusher'],
  ['Skull Crusher (Dumbbell)', 'Triceps', 'Dumbbell', 0, 'Lie on a bench holding dumbbells above your head. Bend at the elbows and lower the dumbbells toward the sides of your head. Extend back to full lockout. Dumbbells allow independent arm movement.', 'Skull Crusher'],
  // TRICEPS — Close Grip Bench Press
  ['Close Grip Bench Press (Barbell)', 'Triceps', 'Barbell', 0, 'Lie on a flat bench and grip the barbell with hands about shoulder-width apart. Lower the bar to your lower chest with elbows tucked to your sides. Press back to full extension. The close grip shifts the emphasis from chest to triceps.', 'Close Grip Bench Press'],
  // TRICEPS — Tricep Kickback
  ['Tricep Kickback (Dumbbell)', 'Triceps', 'Dumbbell', 0, 'Hinge forward with a flat back and brace one hand on a bench. Holding a dumbbell, pin your upper arm parallel to the floor. Extend your forearm straight back by contracting your tricep. Lower under control. Keep the upper arm stationary throughout.', 'Tricep Kickback'],
  ['Tricep Kickback (Cable)', 'Triceps', 'Cable', 0, 'Set a cable to hip height. Hinge forward and grip the handle. Pin your upper arm parallel to the floor and extend your forearm back to full lockout. Cable provides constant resistance throughout the range of motion.', 'Tricep Kickback'],

  // QUADS — Squat
  ['Squat (Barbell)', 'Quads', 'Barbell', 0, 'Position the bar across your upper traps (high bar) or rear delts (low bar). Stand feet shoulder-width apart, toes slightly out. Brace your core and descend until thighs are at least parallel. Drive through your heels to stand, keeping your chest up and knees tracking over your toes.', 'Squat'],
  ['Squat (Bodyweight)', 'Quads', 'Bodyweight', 1, 'Stand with feet shoulder-width apart, toes slightly out. Push your hips back and bend your knees, lowering until your thighs are parallel to the floor. Keep your chest up and knees tracking over your toes. Drive through your heels to stand.', 'Squat'],
  // QUADS — Front Squat
  ['Front Squat (Barbell)', 'Quads', 'Barbell', 0, 'Rest the barbell in a front rack position on your front delts. Keep your elbows high and torso upright as you squat below parallel. Drive straight up to the top. The upright torso demands more quad dominance than a back squat.', 'Front Squat'],
  // QUADS — Leg Press
  ['Leg Press (Machine)', 'Quads', 'Machine', 0, 'Sit with your back flat against the pad and feet shoulder-width apart on the platform. Lower the platform until your knees form roughly 90° — or as low as possible without your lower back rounding off the pad. Press back to full extension without locking your knees. Keep your heels flat on the platform throughout.', 'Leg Press'],
  // QUADS — Leg Extension
  ['Leg Extension (Machine)', 'Quads', 'Machine', 0, 'Sit with your back flat against the pad and the roller positioned just above your ankles, knees bent at 90°. Extend your legs fully, squeezing your quads hard at the top. Lower slowly back to 90°. This is an isolation movement for the quadriceps — keep the movement smooth and avoid jerking the weight up.', 'Leg Extension'],
  // QUADS — Hack Squat
  ['Hack Squat (Machine)', 'Quads', 'Machine', 0, 'Position your shoulders under the pads and feet shoulder-width apart on the platform. Lower until your thighs are parallel or below, keeping your back flat against the pad. Press back to full extension. The machine takes stress off the lower back compared to a free barbell squat.', 'Hack Squat'],
  ['Hack Squat (Barbell)', 'Quads', 'Barbell', 0, 'Hold a barbell behind your legs. Squat down as you lower the bar, keeping your torso upright and heels on the floor. Drive through your heels to stand. This is technically demanding — start light and focus on form.', 'Hack Squat'],
  // QUADS — Lunge
  ['Lunge (Barbell)', 'Quads', 'Barbell', 0, 'Hold a barbell across your upper traps. Step forward and lower your back knee toward the floor, keeping your front shin vertical. Drive through the front heel to return. Alternate legs or complete all reps on one side.', 'Lunge'],
  ['Lunge (Dumbbell)', 'Quads', 'Dumbbell', 0, 'Hold a dumbbell in each hand. Step forward and lower your back knee toward the floor, keeping your torso upright. Push back to the starting position. Dumbbells allow a natural hand position and longer stride.', 'Lunge'],
  ['Lunge (Bodyweight)', 'Quads', 'Bodyweight', 1, 'Stand tall and step forward, lowering your back knee toward the floor. Keep your front shin roughly vertical and torso upright. Drive off the front foot to return. Alternate legs.', 'Lunge'],
  // QUADS — Bulgarian Split Squat
  ['Bulgarian Split Squat (Barbell)', 'Quads', 'Barbell', 0, 'Place the rear foot on a bench and rest a barbell across your traps. Lower your rear knee toward the floor while keeping your torso upright and front knee tracking over your toes. Drive through the front heel to return.', 'Bulgarian Split Squat'],
  ['Bulgarian Split Squat (Dumbbell)', 'Quads', 'Dumbbell', 0, 'Hold a dumbbell in each hand and place your rear foot on a bench. Lower your rear knee toward the floor, keeping your front shin fairly vertical. Drive through your front foot to return.', 'Bulgarian Split Squat'],
  ['Bulgarian Split Squat (Bodyweight)', 'Quads', 'Bodyweight', 1, 'Place your rear foot on a bench and stand in a split stance. Lower your rear knee toward the floor while keeping an upright torso. Drive through your front foot to return. Master the movement pattern before adding load.', 'Bulgarian Split Squat'],
  // QUADS — Step-Up
  ['Step-Up (Dumbbell)', 'Quads', 'Dumbbell', 0, 'Hold a dumbbell in each hand and stand in front of a box or bench. Step one foot on top and drive through the heel to stand on the box. Lower the other foot back to the ground. Alternate legs.', 'Step-Up'],
  ['Step-Up (Barbell)', 'Quads', 'Barbell', 0, 'Place a barbell across your upper traps. Step onto a box or bench with one foot and drive through the heel. Step back down with control. Alternate legs. Ensure the box height allows a safe range of motion.', 'Step-Up'],

  // HAMSTRINGS — Romanian Deadlift
  ['Romanian Deadlift (Barbell)', 'Hamstrings', 'Barbell', 0, 'Stand holding a barbell at hip level. Push your hips back while maintaining a slight knee bend and a neutral spine. Lower the bar along your thighs until you feel a strong hamstring stretch — typically just below the knee. Drive your hips forward to return to the top. Keep your back flat throughout.', 'Romanian Deadlift'],
  ['Romanian Deadlift (Dumbbell)', 'Hamstrings', 'Dumbbell', 0, 'Stand holding dumbbells in front of your thighs. Push your hips back while maintaining a neutral spine, lowering the weights along your legs until you feel a strong hamstring stretch. Drive your hips forward to return. Keep the weights close to your body.', 'Romanian Deadlift'],
  // HAMSTRINGS — Leg Curl
  ['Leg Curl (Machine)', 'Hamstrings', 'Machine', 0, 'Lie face-down with the pad just above your heels and your knees aligned with the machine\'s pivot point. Curl your heels toward your glutes as far as possible, squeezing your hamstrings at the top. Lower slowly to full extension. Keep your hips pressed against the bench — avoid lifting your hips to get extra range.', 'Leg Curl'],
  // HAMSTRINGS — Nordic Hamstring Curl
  ['Nordic Hamstring Curl', 'Hamstrings', 'Bodyweight', 1, 'Kneel with your ankles secured under a pad or bar. Keep your torso straight and lower yourself toward the floor as slowly as possible — your hamstrings resist the fall. Catch yourself at the bottom and push back up with your hands. This is an extremely demanding eccentric exercise.', 'Nordic Hamstring Curl'],
  // HAMSTRINGS — Good Morning
  ['Good Morning (Barbell)', 'Hamstrings', 'Barbell', 0, 'Place a barbell across your upper traps and stand with a soft knee bend. Hinge at the hips, lowering your torso until it\'s roughly parallel to the floor while maintaining a flat back. Drive your hips forward to return. Keep the movement hip-hinge focused, not a squat.', 'Good Morning'],

  // GLUTES — Hip Thrust
  ['Hip Thrust (Barbell)', 'Glutes', 'Barbell', 0, 'Sit with your upper back against a bench and a loaded barbell across your hips. Plant your feet shoulder-width apart, knees bent. Drive through your heels to thrust your hips up until your torso and thighs form a straight line. Squeeze your glutes hard at the top. Lower under control. Keep your chin tucked to avoid hyperextending your neck.', 'Hip Thrust'],
  ['Hip Thrust (Machine)', 'Glutes', 'Machine', 0, 'Sit at a hip thrust machine with your back on the pad and feet flat on the footplate. Drive your hips up until your torso and thighs are in a straight line, squeezing your glutes hard at the top. Lower under control.', 'Hip Thrust'],
  // GLUTES — Glute Bridge
  ['Glute Bridge (Barbell)', 'Glutes', 'Barbell', 0, 'Lie on your back with a barbell across your hips and feet flat on the floor. Drive your hips up by squeezing your glutes until your body forms a straight line from shoulders to knees. Lower under control. Your upper back stays on the floor throughout, unlike a hip thrust.', 'Glute Bridge'],
  ['Glute Bridge', 'Glutes', 'Bodyweight', 1, 'Lie on your back with feet flat on the floor. Drive your hips up by squeezing your glutes until your body forms a straight line from knees to shoulders. Hold briefly at the top, then lower under control.', 'Glute Bridge'],
  // GLUTES — Cable Kickback
  ['Cable Kickback (Cable)', 'Glutes', 'Cable', 0, 'Attach an ankle strap to a low cable. Face the machine and hold the frame for support. Kick the strapped leg straight back, squeezing your glute at full hip extension. Avoid arching your lower back. Lower under control.', 'Cable Kickback'],
  // GLUTES — Sumo Deadlift
  ['Sumo Deadlift (Barbell)', 'Glutes', 'Barbell', 0, 'Stand with a wide stance and toes turned out. Grip the bar inside your legs with a double overhand grip. Brace and drive your feet apart into the floor as you stand up, keeping your chest tall. The wide stance involves the glutes and adductors more than a conventional deadlift.', 'Sumo Deadlift'],

  // CALVES — Calf Raise
  ['Calf Raise (Machine)', 'Calves', 'Machine', 0, 'Position the shoulder pads across your upper traps and stand with your toes on the edge of the platform, heels hanging off. Lower your heels as far as possible to fully stretch your calves, then rise onto your toes as high as possible. Hold briefly at the top. Perform reps slowly — calves respond well to a full range of motion and controlled tempo.', 'Calf Raise'],
  ['Calf Raise (Barbell)', 'Calves', 'Barbell', 0, 'Rest a barbell across your upper traps and stand with toes on a raised surface. Rise onto your toes as high as possible squeezing your calves. Lower your heels to a full stretch. Perform slowly for full range of motion.', 'Calf Raise'],
  ['Calf Raise (Dumbbell)', 'Calves', 'Dumbbell', 0, 'Hold a dumbbell in one hand and balance on the same-side foot on a step or flat surface. Rise onto your toes as high as possible, then lower to a full stretch. Complete all reps on one leg before switching. Single-leg loading is highly effective for calf development.', 'Calf Raise'],
  ['Calf Raise (Bodyweight)', 'Calves', 'Bodyweight', 1, 'Stand with the balls of your feet on a step edge, heels hanging off. Lower your heels to a full calf stretch, then rise onto your toes as high as possible. Perform slowly. Progress by doing single-leg reps or holding a wall for balance.', 'Calf Raise'],
  // CALVES — Seated Calf Raise
  ['Seated Calf Raise (Machine)', 'Calves', 'Machine', 0, 'Sit at a seated calf raise machine with pads across your lower thighs and feet on the platform. Lower your heels to a full stretch then press up onto your toes as high as possible. The seated position emphasizes the soleus muscle more than standing calf raises.', 'Seated Calf Raise'],

  // CORE — Plank
  ['Plank', 'Core', 'Bodyweight', 1, 'Position yourself face-down with forearms on the floor and toes on the floor. Your body should form a straight line from head to heels. Brace your core by pulling your belly button toward your spine and squeeze your glutes. Breathe steadily. Avoid letting your hips sag or pike up. Hold for time.', 'Plank'],
  // CORE — Crunch
  ['Crunch', 'Core', 'Bodyweight', 1, 'Lie on your back with knees bent and feet flat. Curl your shoulders and upper back off the floor by contracting your abs. Hold briefly at the top, then lower under control. Avoid pulling on your neck.', 'Crunch'],
  ['Crunch (Cable)', 'Core', 'Cable', 0, 'Kneel facing a high cable with a rope attachment. Hold the rope beside your head. Crunch down by flexing your spine, pulling your elbows toward your knees. Control the return. Cable adds constant resistance through the range of motion.', 'Crunch'],
  ['Crunch (Machine)', 'Core', 'Machine', 0, 'Sit at an ab crunch machine and grip the handles or pad by your head. Flex your spine forward by contracting your abs. Control the return. The machine allows you to add progressive overload to the crunch movement.', 'Crunch'],
  // CORE — Leg Raise
  ['Leg Raise', 'Core', 'Bodyweight', 1, 'Lie flat or hang from a bar. Keeping your legs straight, raise them to 90° or higher by contracting your lower abs and hip flexors. Lower under control without letting your feet touch the floor between reps.', 'Leg Raise'],
  // CORE — Russian Twist
  ['Russian Twist', 'Core', 'Bodyweight', 1, 'Sit on the floor with knees bent and feet elevated. Lean back slightly and rotate your torso side to side, touching the floor beside your hip at each end. Keep your core braced throughout.', 'Russian Twist'],
  ['Russian Twist (Dumbbell)', 'Core', 'Dumbbell', 0, 'Sit with knees bent and hold a dumbbell with both hands. Lean back slightly and rotate your torso side to side, tapping the weight toward the floor at each end. Elevate your feet for additional difficulty.', 'Russian Twist'],
  // CORE — Ab Wheel Rollout
  ['Ab Wheel Rollout', 'Core', 'Bodyweight', 1, 'Kneel on the floor and grip an ab wheel. Roll forward slowly until your body is nearly horizontal, keeping your core braced and your hips from dropping. Roll back by contracting your abs. Start with partial range of motion and progress gradually.', 'Ab Wheel Rollout'],
  // CORE — Dead Bug
  ['Dead Bug', 'Core', 'Bodyweight', 1, 'Lie on your back with arms extended toward the ceiling and knees bent at 90° above your hips. Slowly lower your right arm and left leg toward the floor while pressing your lower back into the ground. Return to start and repeat on the opposite side. Focus on preventing any lower back arch.', 'Dead Bug'],
  // CORE — Side Plank
  ['Side Plank', 'Core', 'Bodyweight', 1, 'Lie on your side and prop yourself up on one forearm with your body in a straight line from head to feet. Stack or stagger your feet. Brace your core and keep your hips elevated. Avoid letting your hip sag. Hold for time then switch sides.', 'Side Plank'],
  // CORE — Pallof Press
  ['Pallof Press (Cable)', 'Core', 'Cable', 0, 'Stand perpendicular to a cable at chest height. Hold the handle with both hands and step away to create tension. Press the handle straight out from your chest and hold briefly before pulling it back. The cable pulls rotationally — resist it with your core. This is an anti-rotation exercise.', 'Pallof Press'],
];

// Exercises that existed before v5 need renaming + base_name set
const EXERCISE_RENAMES: [string, string, string][] = [
  ['Barbell Bench Press', 'Bench Press (Barbell)', 'Bench Press'],
  ['Incline Bench Press', 'Incline Bench Press (Barbell)', 'Incline Bench Press'],
  ['Barbell Squat', 'Squat (Barbell)', 'Squat'],
  ['Deadlift', 'Deadlift (Barbell)', 'Deadlift'],
  ['Romanian Deadlift', 'Romanian Deadlift (Barbell)', 'Romanian Deadlift'],
  ['Overhead Press', 'Overhead Press (Barbell)', 'Overhead Press'],
  ['Barbell Row', 'Row (Barbell)', 'Row'],
  ['Tricep Pushdown', 'Tricep Pushdown (Cable)', 'Tricep Pushdown'],
  ['Face Pull', 'Face Pull (Cable)', 'Face Pull'],
  ['Leg Press', 'Leg Press (Machine)', 'Leg Press'],
  ['Leg Curl', 'Leg Curl (Machine)', 'Leg Curl'],
  ['Leg Extension', 'Leg Extension (Machine)', 'Leg Extension'],
  ['Hip Thrust', 'Hip Thrust (Barbell)', 'Hip Thrust'],
  ['Calf Raise', 'Calf Raise (Machine)', 'Calf Raise'],
];

// Existing exercises that keep their name but need base_name set
const EXERCISE_BASE_NAME_ONLY: [string, string][] = [
  ['Pull-Up', 'Pull-Up'],
  ['Chin-Up', 'Chin-Up'],
  ['Dip', 'Dip'],
  ['Plank', 'Plank'],
  ['Bicep Curl (Dumbbell)', 'Bicep Curl'],
  ['Lateral Raise (Dumbbell)', 'Lateral Raise'],
  ['Lateral Raise (Cable)', 'Lateral Raise'],
];

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        base_name TEXT NOT NULL DEFAULT '',
        muscle_group TEXT NOT NULL,
        equipment_type TEXT NOT NULL,
        is_bodyweight INTEGER NOT NULL DEFAULT 0,
        is_custom INTEGER NOT NULL DEFAULT 0,
        instructions TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        duration_seconds INTEGER
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        order_index INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        weight_lbs REAL,
        reps INTEGER,
        notes TEXT,
        logged_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await db.execAsync('BEGIN');
    for (const [name, muscle_group, equipment_type, is_bodyweight, instructions, base_name] of SEED_EXERCISES) {
      await db.runAsync(
        'INSERT INTO exercises (name, base_name, muscle_group, equipment_type, is_bodyweight, instructions) VALUES (?, ?, ?, ?, ?, ?)',
        name,
        base_name,
        muscle_group,
        equipment_type,
        is_bodyweight,
        instructions
      );
    }
    await db.execAsync('COMMIT');

    await db.runAsync("INSERT INTO settings (key, value) VALUES ('rest_timer_duration', '90')");
    await db.execAsync('PRAGMA user_version = 1');
  }

  if (version < 2) {
    await migrateToV2(db);
  }

  if (version < 3) {
    await migrateToV3(db);
  }

  if (version < 4) {
    await migrateToV4(db);
  }

  if (version < 5) {
    await migrateToV5(db);
  }
}

async function migrateToV3(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS template_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_exercise_id INTEGER NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      target_reps INTEGER
    );
  `);

  await db.execAsync('PRAGMA user_version = 3');
}

async function migrateToV4(db: SQLiteDatabase) {
  await db.execAsync(
    'ALTER TABLE workout_sessions ADD COLUMN calories_burned INTEGER'
  );
  await db.execAsync('PRAGMA user_version = 4');
}

async function migrateToV2(db: SQLiteDatabase) {
  // On fresh installs (version was 0→1 above) the instructions column already
  // exists in the CREATE TABLE, so we only ALTER on existing v1 databases.
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises)');
  if (!cols.some((c) => c.name === 'instructions')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN instructions TEXT');
  }

  // Fix muscle groups to match PRD granular spec and seed instructions.
  const muscleGroupUpdates: [string, string][] = [
    ['Biceps', 'Bicep Curl (Dumbbell)'],
    ['Triceps', 'Tricep Pushdown'],
    ['Quads', 'Barbell Squat'],
    ['Quads', 'Leg Press'],
    ['Quads', 'Leg Extension'],
    ['Hamstrings', 'Romanian Deadlift'],
    ['Hamstrings', 'Leg Curl'],
    ['Glutes', 'Hip Thrust'],
    ['Calves', 'Calf Raise'],
  ];
  for (const [newGroup, name] of muscleGroupUpdates) {
    await db.runAsync(
      'UPDATE exercises SET muscle_group = ? WHERE name = ? AND is_custom = 0',
      newGroup,
      name
    );
  }

  for (const [name, , , , instructions] of SEED_EXERCISES) {
    await db.runAsync(
      'UPDATE exercises SET instructions = ? WHERE name = ? AND is_custom = 0',
      instructions,
      name
    );
  }

  await db.execAsync('PRAGMA user_version = 2');
}

async function migrateToV5(db: SQLiteDatabase) {
  // Add base_name column for existing DBs; fresh installs already have it from v1.
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises)');
  if (!cols.some((c) => c.name === 'base_name')) {
    await db.execAsync("ALTER TABLE exercises ADD COLUMN base_name TEXT NOT NULL DEFAULT ''");
  }

  // Rename legacy exercises to the new consistent format and set base_name.
  for (const [oldName, newName, baseName] of EXERCISE_RENAMES) {
    await db.runAsync(
      'UPDATE exercises SET name = ?, base_name = ? WHERE name = ? AND is_custom = 0',
      newName,
      baseName,
      oldName
    );
  }

  // Set base_name for exercises that keep their existing name.
  for (const [name, baseName] of EXERCISE_BASE_NAME_ONLY) {
    await db.runAsync(
      'UPDATE exercises SET base_name = ? WHERE name = ? AND is_custom = 0',
      baseName,
      name
    );
  }

  // Insert all seed exercises that don't exist yet (handles new exercises for
  // existing users; fresh installs already have them from v1).
  for (const [name, muscle_group, equipment_type, is_bodyweight, instructions, base_name] of SEED_EXERCISES) {
    await db.runAsync(
      `INSERT INTO exercises (name, base_name, muscle_group, equipment_type, is_bodyweight, is_custom, instructions)
       SELECT ?, ?, ?, ?, ?, 0, ?
       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = ? AND is_custom = 0)`,
      name,
      base_name,
      muscle_group,
      equipment_type,
      is_bodyweight,
      instructions,
      name
    );
  }

  // Default base_name = name for any custom exercises that don't have one yet.
  await db.execAsync("UPDATE exercises SET base_name = name WHERE base_name = '' AND is_custom = 1");

  await db.execAsync('PRAGMA user_version = 5');
}
