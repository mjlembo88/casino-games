import json, subprocess, soundfile as sf, os
from kokoro_onnx import Kokoro
k = Kokoro("tts/kokoro-v1.0.onnx", "tts/voices-v1.0.bin")
VOICE = os.environ.get("VOICE", "am_michael")
lines = [
 ("place_bets","Place your bets."),("no_more_bets","No more bets."),("good_luck","Good luck, everyone."),
 ("blackjack","Blackjack!"),("player_blackjack","Blackjack! Pays three to two."),("blackjack_6to5","Blackjack. Pays six to five."),
 ("insurance","Insurance?"),("insurance_open","Insurance is open. Insurance, anyone?"),("even_money","Even money?"),
 ("insurance_closed","Insurance is closed."),("dealer_peek","Dealer checks for blackjack."),("no_dealer_bj","Nobody home. Play on."),
 ("dealer_bj","Dealer has blackjack."),("dealer_busts","Dealer busts!"),("bust","Too many. Bust."),
 ("push","Push."),("winner","Winner!"),("you_win","You win."),("dealer_wins","Dealer wins."),
 ("shuffling","Shuffling."),("cut_card","There's the cut card. Last hand before the shuffle."),("burn","Burn one."),
 ("double","Double down. One card."),("split","Splitting. Two hands."),("split_aces","Split aces get one card each."),
 ("surrender","Surrender. Half your bet back."),("hit_or_stand","Hit or stand?"),("your_turn","Your turn."),
 ("dealer_stands","Dealer stands."),("dealer_hits","Dealer hits."),("side_bet_win","Side bet winner!"),
 ("perfect_pair","Perfect pair!"),("royal_match","Royal match!"),("lucky_ladies","Lucky ladies!"),("twentyone_plus_three","Twenty one plus three, winner!"),
 ("table_min","Table minimum, please."),("table_max","That's over the table limit."),("welcome","Welcome to the table, Marcus."),
 ("thanks","Thank you for playing."),("bankroll_reset","Fresh chips. Good luck."),
]
for n in range(17,22): lines.append((f"dealer_{n}", f"Dealer has {n}."))
for n in range(4,22): lines.append((f"total_{n}", f"{n}."))
os.makedirs("assets/voice", exist_ok=True)
man = {"model":"hexgrad/Kokoro-82M (v1.0, ONNX via kokoro-onnx)","license":"Apache-2.0","voice":VOICE,"format":"mp3","lines":[]}
for key, text in lines:
    s, sr = k.create(text, voice=VOICE, speed=1.0, lang="en-us")
    sf.write("/tmp/v.wav", s, sr)
    out = f"assets/voice/{key}.mp3"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","/tmp/v.wav","-af","silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse","-ac","1","-b:a","64k",out],check=True)
    man["lines"].append({"key":key,"text":text,"file":f"{key}.mp3","duration_s":round(len(s)/sr,2)})
json.dump(man, open("assets/voice/manifest.json","w"), indent=1)
print(len(lines))
