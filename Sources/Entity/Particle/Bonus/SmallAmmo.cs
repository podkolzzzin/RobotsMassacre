using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Level;

namespace Entity.Particle.Bonus
{
    class SmallAmmo : Bonus
    {
        public override int ImageIndex { get { return 6; } }
        public override int Type { get { return (int)BonusType.SmallAmmo; } }

        public SmallAmmo(int x, int y) : base(x, y) { }

		public override void Use(int playerId)
        {
            GameLevel.GetPlayer(playerId).AddAmmunition(25);
        }
    }
}