import { Profile, Goal, SavingsTransfer } from "../types";

export interface GoalTransferOptions {
  note?: string;
  transferId?: string;
}

/**
 * Aplikuje wpłatę lub wypłatę na pojedynczym celu oszczędnościowym (Model A).
 * - Kwoty dodatnie (amount > 0): wpłata, zwiększa saved.
 * - Kwoty ujemne (amount < 0): wypłata, zmniejsza saved, lecz jest clampowana tak, by saved nie spadło poniżej 0.
 * - Jeśli wypłata następuje przy saved == 0 (lub actualAmount == 0 przy niezerowym amount), cel nie ulega zmianie.
 * - Tworzony jest wpis w g.transfers.
 * - Operacja NIE tworzy transakcji w historii przychodów/wydatków.
 */
export function applyGoalTransfer(
  goal: Goal,
  amount: number,
  isoDate: string,
  options?: GoalTransferOptions
): Goal {
  const actualAmount = amount < 0 ? Math.max(amount, -goal.saved) : amount;
  if (actualAmount === 0 && amount !== 0) return goal;

  const transferId =
    options?.transferId ||
    "tr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const existingTransfers = goal.transfers || [];
  const newTransfer: SavingsTransfer = {
    id: transferId,
    amount: actualAmount,
    isoDate,
    note: options?.note || (actualAmount >= 0 ? "Wpłata" : "Wypłata")
  };

  return {
    ...goal,
    saved: goal.saved + actualAmount,
    transfers: [newTransfer, ...existingTransfers]
  };
}

/**
 * Aplikuje wpłatę/wypłatę na celu oszczędnościowym w ramach profilu (Model A).
 * Zachowuje bez zmian listę transakcji (profile.transactions), nie powodując double-countingu.
 */
export function applyGoalTransferToProfile(
  profile: Profile,
  goalId: string,
  amount: number,
  isoDate: string,
  options?: GoalTransferOptions
): Profile {
  const activeGoal = (profile.goals || []).find((g) => g.id === goalId);
  if (!activeGoal) return profile;

  const updatedGoals = profile.goals.map((g) => {
    if (g.id === goalId) {
      return applyGoalTransfer(g, amount, isoDate, options);
    }
    return g;
  });

  return {
    ...profile,
    goals: updatedGoals
  };
}
