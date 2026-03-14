from datetime import datetime

# Sample data structure for the routines. 
# We could eventually move this to a database or JSON file.

ROUTINES = {
    "Monday": {
        "god": "Shiva",
        "routine": "Wake up early. Practice meditation focusing on breath. Offer water to the Shivling if possible.",
        "prayer": "Om Namah Shivaya"
    },
    "Tuesday": {
        "god": "Hanuman",
        "routine": "Focus on strength and discipline today. Read Hanuman Chalisa.",
        "prayer": "Om Hanumate Namah"
    },
    "Wednesday": {
        "god": "Ganesha",
        "routine": "Focus on removing obstacles and learning something new.",
        "prayer": "Om Gam Ganapataye Namaha"
    },
    "Thursday": {
        "god": "Vishnu / Sai Baba",
        "routine": "Focus on preservation and compassion. Read a chapter of the Bhagavad Gita.",
        "prayer": "Om Namo Bhagavate Vasudevaya"
    },
    "Friday": {
        "god": "Durga / Lakshmi",
        "routine": "Focus on inner strength and gratitude for abundance.",
        "prayer": "Om Dum Durgayei Namaha"
    },
    "Saturday": {
        "god": "Shani",
        "routine": "Focus on patience, discipline, and helping those in need.",
        "prayer": "Om Sham Shanaishcharaye Namaha"
    },
    "Sunday": {
        "god": "Surya",
        "routine": "Wake up before sunrise. Offer water to the Sun. Practice Surya Namaskar.",
        "prayer": "Om Suryaya Namaha"
    }
}

HOURLY_QUOTES = [
    "You have the right to work, but never to the fruit of work. (Gita 2.47)",
    "When meditation is mastered, the mind is unwavering like the flame of a lamp in a windless place. (Gita 6.19)",
    "There is nothing lost or wasted in this life. (Gita 2.40)",
    "Set thy heart upon thy work, but never on its reward. (Gita 2.47)",
    "A person can rise through the efforts of his own mind; or draw himself down, in the same manner. Because each person is his own friend or enemy. (Gita 6.5)",
    "Peacefulness, self-control, austerity, purity, tolerance, honesty, knowledge, wisdom and religiousness—these are the natural qualities by which the brahmanas work. (Gita 18.42)",
    "For him who has conquered the mind, the mind is the best of friends; but for one who has failed to do so, his mind will remain the greatest enemy. (Gita 6.6)",
    "He who is temperate in his habits of eating, sleeping, working and recreation can mitigate all material pains by practicing the yoga system. (Gita 6.17)",
    "Whatever action a great man performs, common men follow. And whatever standards he sets by exemplary acts, all the world pursues. (Gita 3.21)",
    "Those who are motivated only by desire for the fruits of action are miserable, for they are constantly anxious about the results of what they do. (Gita 2.49)",
    "The soul is neither born, and nor does it die. (Gita 2.20)",
    "A man is made by his belief. As he believes, so he is. (Gita 17.3)",
]

def get_routine_for_time():
    now = datetime.now()
    day_name = now.strftime("%A")
    minute = now.minute
    
    # Pick a quote based on the current minute to ensure it changes every minute. 
    # Use modulo arithmetic to loop through the quotes based on the current minute
    quote_index = minute % len(HOURLY_QUOTES)
    quote = HOURLY_QUOTES[quote_index]
    
    daily_plan = ROUTINES.get(day_name, {})
    
    return {
        "day": day_name,
        "time": now.strftime("%I:%M %p"),
        "god": daily_plan.get("god", "Divine"),
        "routine": daily_plan.get("routine", "Focus on peace and mindfulness."),
        "prayer": daily_plan.get("prayer", "Om"),
        "quote": quote
    }
