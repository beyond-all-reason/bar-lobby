/* eslint-disable no-restricted-imports */

import { parseLuaTable } from "../src/renderer/utils/parse-lua-table";

const scenario = `
local scenariodata = {
	index			= 0, --  integer, sort order, MUST BE EQUAL TO FILENAME NUMBER
	scenarioid		= "neurope_traininggrounds", -- no spaces, lowercase, this will be used to save the score
    version         = "1.0", -- increment this to keep the score when changing a mission
	title			= "Training Playground", -- can be anything
	author			= "Damgam", -- your name here
	isnew 			= true,
	imagepath		= "scenario000.jpg", -- placed next to lua file, should be 3:1 ratio banner style
	imageflavor		= " ", -- This text will be drawn over image
    summary         = [[Playground for testing various units.]],
	briefing 		= [[Training Playground for rookies! Test any unit in the game you want against small Raptor groups!]],

	mapfilename		= "Neurope_Remake 4.2", -- the name of the map to be displayed here
	playerstartx	= "10%", -- X position of where player comm icon should be drawn, from top left of the map
	playerstarty	= "50%", -- Y position of where player comm icon should be drawn, from top left of the map
	partime 		= 7800, -- par time in seconds
	parresources	= 50000, -- par resource amount
	difficulty		= 1, -- Percieved difficulty at 'normal' level: integer 1-10
    defaultdifficulty = "Beginner", -- an entry of the difficulty table
    difficulties    = { -- Array for sortedness, Keys are text that appears in selector (as well as in scoring!), values are handicap levels
        {name = "Beginner", playerhandicap = 0 , enemyhandicap = 0},
    },
    allowedsides     = {""}, --these are the permitted factions for this mission
	victorycondition= "Survive", -- This is plaintext, but should be reflected in startscript
	losscondition	= "Loss of all your units",  -- This is plaintext, but should be reflected in startscript
    unitlimits   = {},
    scenariooptions = { -- this will get lua->json->base64 and passed to scenariooptions in game
        --myoption = "dostuff",
        scenarioid = "neurope_traininggrounds", --must be present for scores
		disablefactionpicker = true, -- this is needed to prevent faction picking outside of the allowedsides
		unitloadout = {
			{name = 'armcom', x = 3569, y = 55, z = 8081, rot = 11868 , team = 0},
			{name = 'armmoho', x = 2016, y = 54, z = 6496, rot = 0 , team = 0},
			{name = 'corageo', x = 14896, y = 79, z = 1904, rot = 16384 , team = 0},
		},
			
		--featureloadout = {},
    },
    -- https://github.com/spring/spring/blob/105.0/doc/StartScriptFormat.txt
	startscript		= [[
		[game]
		{
		[allyteam1]
		{
		numallies=0;
		startrectbottom=1;
		startrectleft=0.9;
		startrecttop=0;
		startrectright=1;
		}
		[team1]
		{
		teamleader=0;
		rgbcolor=0.99609375 0.546875 0;
		allyteam=1;
		handicap=0;
		side=Cortex;
		}
		[ai0]
		{
		host=0;
		name=Raptors;
		version=<not-versioned>;
		isfromdemo=0;
		team=1;
		shortname=ChickensAI;
		}
		[modoptions]
		{
		scenariooptions=__SCENARIOOPTIONS__;
		maxunits=10000;
		chicken_graceperiod=5;
		chicken_queentime=120;
		chicken_chickenstart=alwaysbox;
		startmetal=999999;
		startenergy=999999;
		}
		[allyteam0]
		{
		numallies=0;
		startrectbottom=1;
		startrectleft=0;
		startrecttop=0;
		startrectright=0.5;
		}
		[team0]
		{
		teamleader=0;
		rgbcolor=0.99609375 0.546875 0;
		allyteam=0;
		handicap=0;
		side=Armada;
		}
		[player0]
		{
		Name = __PLAYERNAME__;
		rank=0;
		isfromdemo=0;
		team=0;
		}
		numplayers=1;
		gamestartdelay=5;
		myplayername = __PLAYERNAME__;
		gametype = __BARVERSION__;
		ishost=1;
		hostip=127.0.0.1;
		mapname = __MAPNAME__;
		startpostype=2;
		hostport=0;
		numusers=2;
		nohelperais=0;
		
		NumRestrictions=__NUMRESTRICTIONS__;
		[RESTRICT]
		{
			__RESTRICTEDUNITS__
		}

		}
	]],
}

return scenariodata -- scenariodata
`;

const scenario2 = `
local scenariodata = {
	index			= 8, --  integer, sort order, MUST BE EQUAL TO FILENAME NUMBER
	scenarioid		= "Fallendellheadstart008", -- no spaces, lowercase, this will be used to save the score and can be used gadget side
    version         = "1", -- increment this to reset the score when changing a mission, as scores are keyed by (scenarioid,version,difficulty)
	title			= "A Head Start", -- can be anything
	author			= "Beherith", -- your name here
	imagepath		= "scenario008.jpg", -- placed next to lua file, should be 3:1 ratio banner style
	imageflavor		= "Your starting base", -- This text will be drawn over image
    summary         = [[An enemy Commander has set up operations on Fallendell, where you already have a strong presence. Prevent him from taking further territory.]],
	briefing 		= [[You will start with a small base of operations, and a considerable amount of resources. Use your initial scouting units to locate the enemy commander and liquidate him before he gains a foothold.
 
 
Tips:
 
 ‣  Construction Turrets will assist in the construction of any unit or building within their build radius.
 
 ‣  The enemy Commander will try to expand to get more resources, stop him as soon as you feel ready for it
 
 ‣  Continue building a farm of Wind Generators on the hill where they can be easily protected
 
 ‣  Build attacking units immediately or use your advantage to build a Tier 2 Bot Lab for advanced units
  
 
Scoring:
  
 ‣  Time taken to complete the scenario
 ‣  Resources spent to get a confirmed kill on all enemy units.
 
 ]],

	mapfilename		= "Fallendell_V4", -- the name of the map to be displayed here, and which to play on, no .smf ending needed
	playerstartx	= "20%", -- X position of where player comm icon should be drawn, from top left of the map
	playerstarty	= "20%", -- Y position of where player comm icon should be drawn, from top left of the map
	partime 		= 3000, -- par time in seconds (time a mission is expected to take on average)
	parresources	= 1000000, -- par resource amount (amount of metal one is expected to spend on mission)
	difficulty		= 1, -- Percieved difficulty at 'normal' level: integer 1-10
    defaultdifficulty = "Normal", -- an entry of the difficulty table
    difficulties    = { -- Array for sortedness, Keys are text that appears in selector (as well as in scoring!), values are handicap levels
    -- handicap values range [-100 - +100], with 0 being regular resources
    -- Currently difficulty modifier only affects the resource bonuses
        {name = "Beginner", playerhandicap = 50, enemyhandicap=0},
        {name = "Novice"  , playerhandicap = 25, enemyhandicap=0},
        {name = "Normal"  , playerhandicap = 0, enemyhandicap=0},
        {name = "Hard"    , playerhandicap = 0,  enemyhandicap=25},
        {name = "Brutal" , playerhandicap = 0,  enemyhandicap=50},
    },
    allowedsides     = {"Armada"}, --these are the permitted factions for this mission, ch0ose from {"Armada", "Cortex", "Random"}
	victorycondition= "Kill all enemy construction units", -- This is plaintext, but should be reflected in startscript
	losscondition	= "Lose all of your construction units",  -- This is plaintext, but should be reflected in startscript
    unitlimits   = { -- table of unitdefname : maxnumberofthese units, 0 means disable it
        -- dont use the one in startscript, put the disabled stuff here so we can show it in scenario window!
        --armavp = 0,
        --coravp = 0,
    } ,

    scenariooptions = { -- this will get lua->json->base64 and passed to scenariooptions in game
        myoption = "dostuff", -- blank
        scenarioid = "Fallendellheadstart008", -- this MUST be present and identical to the one defined at start
		disablefactionpicker = true, -- this is needed to prevent faction picking outside of the allowedsides

        unitloadout = {
			-- You can specify units that you wish to spawn here, they only show up once game starts,
			-- You can create these lists easily using the feature/unit dumper by using dbg_feature_dumper.lua widget pinned to the #challenges channel on discord
			-- Set up a skirmish like your scenario, so the team ID's will be correct
			-- Then using /globallos and cheats, add as many units as you wish
			-- The type /luaui dumpunits
			-- Fish out the dumped units from your infolog.txt and add them here
			-- Note: If you have ANY units in loadout, then there will be no initial units spawned for anyone, so you have to take care of that
			-- so you must spawn the initial commanders then!

            {name = 'corcom', x = 5393, y = 52, z = 2270, rot = -8148 , team = 1},
            {name = 'armcom', x = 1657, y = 154, z = 836, rot = 22554 , team = 0},
            {name = 'cormex', x = 5816, y = 4, z = 3032, rot = 0 , team = 1},

		},
		featureloadout = {
			-- Similarly to units, but these can also be resurrectable!
            -- You can /give corcom_dead with cheats when making your scenario, but it might not contain the 'resurrectas' tag, so be careful to add it if needed
			 -- {name = 'corcom_dead', x = 1125,y = 237, z = 734, rot = "0" , scale = 1.0, resurrectas = "corcom"}, -- there is no need for this dead comm here, just an example
		}
    },
    -- Full Documentation for start script here:
    -- https://github.com/spring/spring/blob/105.0/doc/StartScriptFormat.txt

    -- HOW TO MAKE THE START SCRIPT: Use Chobby's single player mode to set up your start script. When you launch a single player game, the start script is dumped into infolog.txt
    -- ModOptions: You can also set modoptions in chobby, and they will get dumped into the infolog's start script too, or just set then in chobby and copy paste them into the [modoptions] tag. as below
    -- The following keys MUST be present in startscript below
    --  scenariooptions = __SCENARIOOPTIONS__;
    -- Name = __PLAYERNAME__;
    -- myplayername = __PLAYERNAME__;
    -- gametype = __BARVERSION__;
    -- mapname =__MAPNAME__;

    -- Optional keys:
    -- __ENEMYHANDICAP__
    -- __PLAYERSIDE__
    -- __PLAYERHANDICAP__
    -- __NUMRESTRICTIONS__
    -- __RESTRICTEDUNITS__

	startscript		= [[[GAME]
{
	[allyTeam0]
	{
		numallies = 0;
	}

	[team1]
	{
		Side = Cortex;
        Handicap = __ENEMYHANDICAP__;
		RgbColor = 0.63758504 0.35682863 0.61179775;
		AllyTeam = 1;
		TeamLeader = 0;
        StartPosX = 5000;
        StartPosZ = 1400;
	}

	[team0]
	{
        Side = __PLAYERSIDE__;
		Handicap = __PLAYERHANDICAP__;
		RgbColor = 0.59311622 0.61523652 0.54604363;
		AllyTeam = 0;
		TeamLeader = 0;
        StartPosX = 1200;
        StartPosZ = 800;
	}

	[modoptions]
	{
        deathmode = builders;
        scenariooptions = __SCENARIOOPTIONS__;
        startenergy = 7000;
	}

	[allyTeam1]
	{
		numallies = 0;
	}

	[ai0]
	{
		Host = 0;
		IsFromDemo = 0;
		Name = SimpleAI  (2);
		ShortName = SimpleAI;
		Team = 1;
	}

	[player0]
	{
		IsFromDemo = 0;
        Name = __PLAYERNAME__;
		Team = 0;
		rank = 0;
	}

	NumRestrictions=__NUMRESTRICTIONS__;

	[RESTRICT]
	{
        __RESTRICTEDUNITS__
	}

	hostip = 127.0.0.1;
	hostport = 0;
	numplayers = 1;
	startpostype = 3; // 0 fixed, 1 random, 2 choose in game, 3 choose before game (see StartPosX)
    mapname = __MAPNAME__;
	ishost = 1;
	numusers = 2;
    gametype = __BARVERSION__;
    GameStartDelay = 5;  // seconds before game starts after loading/placement
    myplayername = __PLAYERNAME__;
	nohelperais = 0;
}
	]],

}

return scenariodata
`;

const scenario3 = `
local scenariodata = {
    allowedsides     = {"Armada","Cortex","Random"}, --these are the permitted factions for this mission
    unitlimits   = { -- table of unitdefname : maxnumberoftese units, 0 means disable it        -- dont use the one in startscript, put the disabled stuff here so we can show it in scenario window!
        armavp = 0,
        coravp = 0
    }
}

return scenariodata
`;

test("scenario 1", async () => {
    const data = parseLuaTable(Buffer.from(scenario));

    expect(data.index).toEqual(0);
    expect(data.scenarioid).toEqual("neurope_traininggrounds");
});

test("scenario 2", async () => {
    const data = parseLuaTable(Buffer.from(scenario2));

    expect(data.index).toEqual(8);
    expect(data.scenarioid).toEqual("Fallendellheadstart008");
});

test("scenario 3", async () => {
    const data = parseLuaTable(Buffer.from(scenario3));

    expect(data.allowedsides).toEqual(["Armada", "Cortex", "Random"]);
    expect(data.unitlimits).toEqual({
        armavp: 0,
        coravp: 0,
    });
});
