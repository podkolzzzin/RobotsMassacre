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
    public class MineBonus : Bonus
    {
        public override bool ForInventory { get { return true; } }
        public override int ImageIndex { get { return 8; } }
        public override int Type { get { return (int)BonusType.MineBonus; } }

        public MineBonus(int x, int y) : base(x, y, 7500) { }

		public override void PickUp(int playerId)
        {
            GameLevel.GetPlayer(playerId).AddInvItem(new MineInv());
        }

        public override string ToString()
        {
            return "mine";
        }
    }
}