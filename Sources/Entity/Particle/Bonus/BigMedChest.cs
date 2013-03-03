using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Level;

namespace Entity.Particle.Bonus
{
    public class BigMedChest : Bonus
    {
        public override int ImageIndex { get { return 1; } }
        public override int Type { get { return (int)BonusType.BigMedChest; } }

        public BigMedChest(int x, int y) : base(x, y) { }

		public override void Use(int playerId)
        {
            GameLevel.GetPlayer(playerId).Heal(50);
        }
    }
}