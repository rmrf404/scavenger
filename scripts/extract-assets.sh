#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/assets/sprites"
mkdir -p "$OUT"

crop_sprite() {
  local src="$1"
  local name="$2"
  local rect="$3"
  magick "$ROOT/assets/source/$src" \
    -crop "$rect" +repage \
    -alpha set \
    -channel A -fx '((r>0.68)&&(g>0.68)&&(b>0.68)&&(abs(r-g)<0.10)&&(abs(r-b)<0.10))?0:a' +channel \
    -trim +repage \
    "$OUT/$name.png"
}

# Characters and enemies.
crop_sprite characters.png player_idle 275x275+35+395
crop_sprite characters.png player_fire 305x265+310+400
crop_sprite characters.png spider 265x160+25+115
crop_sprite characters.png spider_dash 285x180+310+105
crop_sprite characters.png roller 200x220+735+80
crop_sprite characters.png roller_dash 230x220+970+82
crop_sprite characters.png shield_bot 250x275+650+390
crop_sprite characters.png shield_bot_swing 290x285+955+385
crop_sprite characters.png medic_drone 230x220+25+835
crop_sprite characters.png medic_drone_fire 255x230+305+825
crop_sprite characters.png turret 220x220+675+840
crop_sprite characters.png turret_fire 285x230+950+830

# Pickups and equipment.
crop_sprite items.png xp_crystal 230x260+45+55
crop_sprite items.png medkit 220x250+360+50
crop_sprite items.png scrap 250x200+645+85
crop_sprite items.png power_cell 190x255+1010+35
crop_sprite items.png magnet 210x210+55+345
crop_sprite items.png shield_pickup 230x230+350+335
crop_sprite items.png chest 280x220+635+330
crop_sprite items.png reactor 220x245+990+325
crop_sprite items.png green_crystal 260x250+45+625
crop_sprite items.png drone_chip 230x205+640+665
crop_sprite items.png armor_plate 220x200+970+675
crop_sprite items.png fuel 210x245+55+950
crop_sprite items.png health_orb 210x215+350+955
crop_sprite items.png keycard 205x225+660+960

# Props and destructibles.
crop_sprite props.png crate 270x210+60+70
crop_sprite props.png barrel 160x215+430+50
crop_sprite props.png generator 280x230+670+55
crop_sprite props.png obelisk 220x270+1005+35
crop_sprite props.png console 235x235+45+360
crop_sprite props.png barricade 310x180+360+400
crop_sprite props.png cannon 260x210+720+395
crop_sprite props.png cable 275x160+965+410
crop_sprite props.png junk 265x185+65+710
crop_sprite props.png wrecked_spider 310x200+405+705
crop_sprite props.png antenna 170x230+755+685
crop_sprite props.png lamp 165x250+1050+660
crop_sprite props.png sandbags 330x190+40+995
crop_sprite props.png locked_chest 260x210+500+1005
crop_sprite props.png warning_sign 180x235+890+985

# Terrain and effects.
crop_sprite terrain_effects.png tile_metal 260x165+40+55
crop_sprite terrain_effects.png tile_sand 260x165+350+55
crop_sprite terrain_effects.png tile_hazard 260x165+660+55
crop_sprite terrain_effects.png cracked_slab 245x185+990+45
crop_sprite terrain_effects.png acid_pool 360x220+30+320
crop_sprite terrain_effects.png crater 320x210+490+330
crop_sprite terrain_effects.png road_slab 330x210+835+315
crop_sprite terrain_effects.png rocks 265x170+95+625
crop_sprite terrain_effects.png rubble 450x220+560+610
crop_sprite terrain_effects.png ice_beam 340x150+50+850
crop_sprite terrain_effects.png blast_small 260x190+500+845
crop_sprite terrain_effects.png blast_big 420x255+790+780
crop_sprite terrain_effects.png lightning 300x160+45+1075
crop_sprite terrain_effects.png rocket 290x130+410+1100
crop_sprite terrain_effects.png spark 235x185+725+1060
crop_sprite terrain_effects.png portal 305x165+920+1070

# UI slices used as accents.
crop_sprite ui.png portrait 175x190+15+10
crop_sprite ui.png ui_bolt 100x120+5+280
crop_sprite ui.png ui_blast 105x120+110+280
crop_sprite ui.png ui_med 105x120+230+280
crop_sprite ui.png ui_target 105x120+350+280
crop_sprite ui.png panel 380x250+500+350
crop_sprite ui.png button_teal 140x55+5+1005
crop_sprite ui.png button_green 140x55+150+1005
crop_sprite ui.png button_gold 140x55+300+1005
crop_sprite ui.png button_red 140x55+450+1005
