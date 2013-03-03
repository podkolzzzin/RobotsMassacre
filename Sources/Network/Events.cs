using Entity;
using Entity.Particle.Bonus;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Network
{
    public delegate void PlayerDirectionChanged(int id, int x, int y, Directions direction);
    public delegate void PlayerStartedMoving(int id, int x, int y);
    public delegate void PlayerStoppedMoving(int id, int x, int y);
    public delegate void PlayerShoot(Bullet b);
    public delegate void PlayerConnected(Player p);
	public delegate int OnGetGameMode();
    public delegate List<GEntity>[] OnGetGameState();
    public delegate Dictionary<int, Bonus> OnGetBonus();
    public delegate void AddPlayerProgressChanged(double progress);
    public delegate void AddPlayerComplete();
    public delegate void RemoveBonus(int bonusId);
}