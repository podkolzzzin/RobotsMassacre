using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Inventory;
using Level;

namespace Entity.Particle.Bonus
{
    public class DispenserBonus : Bonus
    {
        public override bool ForInventory { get { return true; } }
        public override int ImageIndex { get { return 10; } }
        public override int Type { get { return (int)BonusType.DispenserBonus; } }

        public DispenserBonus(int x, int y) : base(x, y, 7500) { }

		public override void PickUp(int playerId)
        {
            GameLevel.GetPlayer(playerId).AddInvItem(new DispenserInv());
        }

        public override string ToString()
        {
            return "dispenser";
        }
    }
}