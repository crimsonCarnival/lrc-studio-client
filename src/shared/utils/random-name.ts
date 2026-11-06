// Irreverent, not hateful: no slurs, real people, ethnic or sexual-orientation jokes, or explicit
// sexual terms. These land on public profiles and session credits for people who never picked them.
// Every entry must fit the guest-name limit (40) and the display-name limit (50).
export const RANDOM_NAMES = [
  '2nd Hand Sock', 'Air Biscuit', 'Bankrupt Rage', 'Beef Bandito', 'Bloated Bag', 'Bolt Shooter',
  'Bronx Cheer', 'Brown Eyed Girl', 'Bush Bandit', 'Cauliflower Arse', 'Chunder Munchkin',
  'Chutney Bunker', "Clown's Pocket", 'Cocoa Shunter', 'Collar & Cuffs', 'Crack Horse', 'Dead Lemon',
  'Dead Wipe', 'Diddy Ride', "Donner's Kebab", 'Fingers and Tops', "Gentlemen's Relish", 'Handy Shandy',
  'Holy Colon', 'Hot Pants', 'Juice Trigger', 'Kohl Bunker', 'Little Bishop', 'Loose Pink',
  'Love Burglar', 'Love Lips', 'Love Torpedo', 'Lush Gush', 'Mary Hinge', 'Melancholy Thatch',
  'Monkey Puss', "Monkey's Thumb", "Mouse's Ear", 'Mr Winky', 'Neigh Bother', 'No Wasps',
  'One-Eyed Warrior', 'Panhandle', 'Pebbledash', 'Piddle in Perspex', 'Purple Love', 'Rocinante',
  'Ring of Fire', "Salt 'n' Sauce", 'Sausage Sandwich','Silvery Tear', 'Skittery Trots',
  'Slap & Tickle', 'Smellyama', 'Spam Javelin', 'Spicy Mushroom', 'Split Kipper', 'Sterilized Steed',
  'Stool Pigeon', 'Tagnut', 'Tax the Poor', 'Tester Turd', "That's Bollocks", 'The Angry Captain',
  'Tummy Squeaker', 'Tunky Packer', 'Turbot Tornado', 'Up the Dumper', 'Uphill Gardener',
  'Vinegar Stroke', 'Watery Passage', 'Weasel Burglar', 'Wee Crunchie', 'Wet Cabbage', 'Yoghurt Cannon',

  'A Tethered End', 'Bad Egg', 'Banana Hammock', 'Better than Nothing', 'Bleet Me Baby', 'Blue Dream',
  'Borrowed Sorrow', 'Bouncy Blessed', 'Cancelled Check', "Can't Be Wronger", 'Clapback Charlie',
  'Constant Brag', 'Country Stuck', 'Crackers and Please', 'Creepy Dentist', 'Crock Janley',
  "Dancin' Pole", "Dancin' Shoes", 'Darling Ricki', 'Dead Fam', 'Dead Heat Hattie', 'Divorced Doctor',
  'Downtown Renown', 'Dream Shatterer', 'Drone Warning', 'Drunken Brandee', 'Feed the Trolls',
  'Fire Hazards', 'Flipped Wig', 'Friendly Fire', 'Getting Haughty', 'Hard Time Done',
  'Hell for Weather', 'Hot & Bothered', 'Invade Grenade', "It's a Trap", 'Lead Is out', 'Lit as Truck',
  'Los Santos Savior', 'Measles Smeezles', 'Micro Aggression', 'Minimum Wager', 'Miss Triggered',
  'Mister Redacted', 'Mister Scissors', 'Money to Burn', 'Moon Rocks', 'Mr. Worthwhile', 'Mud Dragon',
  'Night-time Mare', 'Northern Lights', 'Nuns Orders', 'Old Ill Will', 'Omens and Ice', 'Pedestrian',
  'Pretty as a Pistol', 'Questionable Dignity', 'Robocall', 'Salty and Woke', 'Scrawny Nag',
  'Sir Scrambled', 'Social Media Warrior', 'Square to Go', 'Study Buddy', 'Stupid Money',
  'Sumptin Saucy', 'Sweet Releaf', 'Tenpenny', 'There She Blows', 'Throwing Shady', 'Thunder Skunk',
  'Total Belter', 'Turnt Mood', 'Uptown Rider', 'Wee Scunner', 'Worth a Kingdom', "Yay Yo Let's Go",
  'Yellow Sunshine',

  // Added for the lyrics crowd.
  'Off-Key Kevin', 'Mumble Rapper', 'Flat Earth Falsetto', 'Capo on Fret Nine', 'Auto-Tune Tony',
  'Third Verse Same as the First', 'Bridge Burner', 'Hook Line and Stinker', 'Chorus Hoarder',
  'Wrong Lyric Larry', 'Misheard Mondegreen', 'Ear Worm Wendy', 'One Hit Blunder', 'Key Change Chad',
  'Encore Goblin', 'Soundcheck Gremlin', 'Backing Vocal Betty', 'Hidden Track Harry',
  'Liner Note Loiterer', 'B-Side Bandit', 'Skipped Track', 'Shuffle Offender', 'Lip Sync Lenny',
  'Sold-Out Soloist', 'Karaoke Menace', 'Mic Drop Mishap', 'Feedback Loop Larry', 'Cowbell Cartel',
  'Tambourine Tyrant', 'Triangle Player', 'Air Guitar Hero', 'Vinyl Vandal', 'Cassette Chewer',
  'Burnt CD Barry', 'Pirate Radio Pete', 'Elevator Muzak', 'Hold Music Hostage', 'Jingle Junkie',
  'Ringtone Ruiner', 'Dad Rock Dave', 'Soft Rock Sally', 'Emo Phase', 'Pre-Chorus Panic',
  'Rhyme Crime', 'Orange Rhymes with Nothing', 'Sharp Sharpie', 'Flat Pack Philharmonic',
  'Unplugged Gone Wrong', 'Greatest Hits Volume Nine', 'Lukewarm Take', 'Hot Mess Express',
  'Sleep Deprived Sam', 'Damp Sock Disco', 'Soggy Biscuit Bob', 'Lost Remote', 'Suspicious Puddle',
  'Gravy Boat Captain', 'Moist Towelette', 'Passive Aggressive Pete', 'Mildly Concerned',
  'Professional Napper', 'Keyboard Warrior', 'Midlife Crisis Mike', 'Leftover Lasagna',
  'Questionable Casserole', 'Sentient Meatloaf', 'Grumpy Gnocchi', 'Burnt Toast Betty',
  'Wobbly Shopping Cart', 'Toe Stubber', 'Sock Drawer Bandit',
  'Fidget Spinner Gen', 'Tinfoil Hatter', 'Karen Adjacent', 'Chad Adjacent', 'Beige Flag',
  'Red Flag Rita', 'Hangry Hippo', 'Bad Idea Bear', 'Regret Generator', 'Typo Terry',
] as const;

export function randomDisplayName(exclude?: string): string {
  const pool = RANDOM_NAMES.filter((n) => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}
