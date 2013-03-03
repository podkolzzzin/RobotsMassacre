using Entity;
using Entity.Particle.Bonus;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Network
{
	public partial class GameClient
	{
		public event AddPlayerProgressChanged AddPlayerProgress;
		public event AddPlayerComplete AddPlayerComplete;
		public event RemoveBonus OnBonusRemoved;
		public event OnGetGameMode GetGameMode;
		public event OnGetGameState GetGameState;
		public event OnGetBonus GetBonuses;

		public Player CurrentPlayer;
		public List<GEntity> Entities;
		public List<Player> Players;

		private double _progress;

		public int Mode
		{
			get
			{
				return GetGameMode();
			}
		}

		public List<GEntity>[] CurrentGameState
		{
			get
			{
				return GetGameState();
			}
		}

		public Dictionary<int, Bonus> Bonuses
		{
			get
			{
				return GetBonuses();
			}
		}

		public void OnBonusAdd(Bonus B)
		{
			if (IsMain) lastAddedBonus = B;
		}

		public void OnBonusRemove(int Id)
		{
			lastRemovedBonus = Id;
		}
	}
}