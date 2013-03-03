using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Level;

namespace Entity.Particle.Bonus
{
    public class APBullets : Bonus
    {
        public override int ImageIndex { get { return 2; } }
        public override int Type { get { return (int)BonusType.APBullets; } }

        public APBullets(int x, int y) : base(x, y, 7500) { }

		public override void PickUp(int playerId)
        {
            GameLevel.GetPlayer(playerId).AddPickedBonus(this);
        }

        public override string ToString()
        {
            return "ap-bullets";
        }
    }
}