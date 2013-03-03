using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity;
using Level;

namespace Inventory
{
    public class DispenserInv : InvItem
    {
        public override int ImageIconIndex { get { return 10; } }
        public override int[] ItemImageIndexes { get { return new int[] { 10, 1 }; } }
        public override int HologramIndex { get { return 1; } }
        public override int ActivationKey { get { return 4; } }

		public override InvType Type { get { return InvType.Dispenser; } }

        public override void Use(int playerId)
        {
            if (GameLevel.CreateEntity(new Dispenser(0, 0, 0), playerId))
            {
                base.Use();
            }
        }

        public override string ToString()
        {
            return "inventory-dispenser";
        }
    }
}