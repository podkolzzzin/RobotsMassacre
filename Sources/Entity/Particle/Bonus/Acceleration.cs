using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Level;

namespace Entity.Particle.Bonus
{
    public class Acceleration : Bonus
    {
        public override int ImageIndex { get { return 4; } }
        public override int Type { get { return (int)BonusType.Acceleration; } }

        public Acceleration(int x, int y) : base(x, y, 8000) { }

		public override void PickUp(int playerId)
        {
            GameLevel.GetPlayer(playerId).AddPickedBonus(this);
        }

        public override string ToString()
        {
            return "acceleration";
        }
    }
}