import random
random.seed(10)

NUM_CHARGEPOINTS = 20
CHARGING_POWER_KW = 11
CONSUMPTION_KWH_PER_100KM = 18
INTERVALS_PER_DAY = 24 * 4
DAYS_PER_YEAR = 365
TOTAL_INTERVALS = INTERVALS_PER_DAY * DAYS_PER_YEAR
INTERVAL_DURATION_HOURS = 15/60

hourly_arrival_probs = [
  0.94, 0.94, 0.94, 0.94, 0.94, 0.94, 0.94, 0.94,
  2.83, 2.83, 5.66, 5.66, 5.66, 7.55, 7.55, 7.55,
  10.38, 10.38, 10.38, 4.72, 4.72, 4.72, 0.94, 0.94
]
interval_arrival_probs = [p / 100 for p in hourly_arrival_probs for _ in range(4)]

charging_demand_distribution = [
  (34.31, 0),
  (4.90, 5),
  (9.80, 10),
  (11.76, 20),
  (8.82, 30),
  (11.76, 50),
  (10.78, 100),
  (4.90, 200),
  (2.94, 300)
]

demand_weights = [item[0] for item in charging_demand_distribution]
demand_kms = [item[1] for item in charging_demand_distribution]

def sample_demand_km():
  return random.choices(demand_kms, weights=demand_weights, k=1)[0]

def simulation(
  num_chargepoints=NUM_CHARGEPOINTS,
  total_intervals=TOTAL_INTERVALS,
  interval_per_day=INTERVALS_PER_DAY,
  consumption_kwh_per_100km=CONSUMPTION_KWH_PER_100KM,
  charging_power_kw=CHARGING_POWER_KW,
  interval_duration_hours=INTERVAL_DURATION_HOURS
):
  chargers = [None] * num_chargepoints  # Stores end-time (interval) of each charging session
  total_energy_kwh = 0.0
  max_power_demand_kw = 0.0

  for tick in range(total_intervals):
    hour_idx = tick % interval_per_day
    arrival_prob = interval_arrival_probs[hour_idx]

    # Free up finished chargers
    for i in range(num_chargepoints):
      if chargers[i] is not None and chargers[i] <= tick:
        chargers[i] = None

    # Try to assign a new EV to a free charger
    for i in range(num_chargepoints):
      if chargers[i] is None and random.random() < arrival_prob:
        distance_km = sample_demand_km()
        if distance_km == 0:
          continue
        energy_kwh = (distance_km / 100) * consumption_kwh_per_100km
        charge_duration_intervals = round((energy_kwh / charging_power_kw) / interval_duration_hours)
        chargers[i] = tick + charge_duration_intervals
        total_energy_kwh += energy_kwh
        break  # Only one EV arrival attempt per interval

    active_chargers = len([x for x in chargers if x is not None])
    power_kw = active_chargers * charging_power_kw
    max_power_demand_kw = max(max_power_demand_kw, power_kw)

  theoretical_max_kw = num_chargepoints * charging_power_kw
  concurrency_factor = max_power_demand_kw / theoretical_max_kw

  return total_energy_kwh, theoretical_max_kw, max_power_demand_kw, concurrency_factor

total_energy_kwh, theoretical_max_kw, max_power_demand_kw, concurrency_factor = simulation()

print(f"Total energy consumed: {total_energy_kwh:.2f} kWh")
print(f"Theoretical maximum power demand: {theoretical_max_kw} kW")
print(f"Actual maximum power demand: {max_power_demand_kw} kW")
print(f"Concurrency factor: {concurrency_factor:.2f}")

# Bonus task
concurrency_factors = []

for n in range(1, 31):
    _, _, _, concurrency_factor = simulation(num_chargepoints=n)
    concurrency_factors.append(concurrency_factor)

import matplotlib.pyplot as plt
plt.plot(range(1, 31), concurrency_factors)
plt.xlabel('Number of chargepoints')
plt.ylabel('Concurrency factor')
plt.title('Concurrency factor vs. number of chargepoints')
plt.show()
